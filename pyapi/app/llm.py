import logging
import re
import threading

from .config import Settings, settings
from .prompts import SYSTEM_PROMPT

log = logging.getLogger(__name__)

_STOPWORDS = {
    "and", "the", "for", "with", "you", "our", "are", "will", "that", "this",
    "have", "from", "your", "their", "they", "who", "has", "was", "were", "job",
    "role", "work", "team", "years", "experience", "strong", "good", "plus",
    "hiring", "senior", "junior", "looking", "build", "building", "own", "owns",
    "across", "using", "about", "into", "within", "while", "than", "them",
}

_ROLE = re.compile(
    r"\b((?:[A-Za-z][\w+#.]*\s+){0,3}"
    r"(?:engineer|developer|lead|architect|manager|scientist|designer|analyst))\b",
    re.IGNORECASE,
)

_ROLE_LEAD_IN = {"a", "an", "the", "our", "for", "as", "is", "we", "are", "hiring"}


def _keywords(text: str, limit: int) -> list[str]:
    seen: dict[str, None] = {}
    for word in re.findall(r"[A-Za-z][A-Za-z+#./-]{2,}", text):
        key = word.strip(".-/")
        if len(key) < 3 or key.lower() in _STOPWORDS:
            continue
        seen.setdefault(key, None)
        if len(seen) == limit:
            break
    return list(seen)


def _role(job: str) -> str:
    match = _ROLE.search(job)
    if not match:
        return "this role"

    words = match.group(1).split()
    while words and words[0].lower() in _ROLE_LEAD_IN:
        words.pop(0)
    return " ".join(words) if words else "this role"


def _pairs(words: list[str]) -> list[str]:
    return [f"{first} {second}" for first, second in zip(words, words[1:])]


def _overlap(job: str, resume: str, limit: int) -> list[str]:
    """Skills named in both texts: the strongest thing a cover letter can cite."""
    job_words = _keywords(job, 120)
    resume_words = _keywords(resume, 120)
    wanted = {word.lower() for word in job_words}

    # Two-word matches first, so "Spring Boot" is not reported as "Spring, Boot".
    job_pairs = {pair.lower() for pair in _pairs(job_words)}
    shared: list[str] = []
    consumed: set[str] = set()

    for pair in _pairs(resume_words):
        if pair.lower() in job_pairs and len(shared) < limit:
            shared.append(pair)
            consumed.update(word.lower() for word in pair.split())

    for word in resume_words:
        if len(shared) == limit:
            break
        if word.lower() in wanted and word.lower() not in consumed:
            shared.append(word)
            consumed.add(word.lower())

    return shared


class TemplateBackend:
    """Deterministic composer. Keeps the endpoint useful with no weights loaded."""

    name = "template"

    def generate(self, context: str) -> str:
        job, resume = _split_context(context)
        role = _role(job)
        shared = _overlap(job, resume, 4)
        strengths = shared or _keywords(resume, 4) or ["the core of your stack"]

        return (
            f"Dear Hiring Manager, I am writing to apply for the {role} position, "
            "and I would be glad to contribute from day one.\n"
            f"My background covers {_listed(strengths)}, which maps directly onto "
            "what the role calls for.\n"
            "What sets me apart from other candidates is that I have already "
            "delivered this work end to end in production, not only studied it.\n"
            "I am very much looking forward to being invited to an interview to "
            "discuss how I can help your team."
        )


def _listed(items: list[str]) -> str:
    if len(items) == 1:
        return items[0]
    return f"{', '.join(items[:-1])} and {items[-1]}"


def _split_context(context: str) -> tuple[str, str]:
    job = ""
    resume = ""
    if "Job description:" in context:
        _, _, rest = context.partition("Job description:")
        job, _, resume = rest.partition("Resume:")
    return job.strip(), resume.strip()


class TransformersBackend:
    """Hugging Face causal LM run through PyTorch, loaded once per process."""

    name = "transformers"

    def __init__(self, config: Settings) -> None:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        self._torch = torch
        self._config = config
        self._lock = threading.Lock()
        self.device = _resolve_device(torch, config.device)

        log.info("loading %s on %s", config.model_id, self.device)
        self._tokenizer = AutoTokenizer.from_pretrained(config.model_id)
        self._model = AutoModelForCausalLM.from_pretrained(
            config.model_id,
            dtype=torch.float32 if self.device == "cpu" else torch.float16,
        )
        self._model.to(self.device)
        self._model.eval()

    def generate(self, context: str) -> str:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": context},
        ]
        prompt = self._tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        inputs = self._tokenizer(prompt, return_tensors="pt").to(self.device)

        # One model instance is shared by every request; generate() is not reentrant.
        with self._lock, self._torch.inference_mode():
            output = self._model.generate(
                **inputs,
                max_new_tokens=self._config.max_new_tokens,
                temperature=self._config.temperature,
                do_sample=self._config.temperature > 0,
                pad_token_id=self._tokenizer.eos_token_id,
            )

        generated = output[0][inputs["input_ids"].shape[-1] :]
        return self._tokenizer.decode(generated, skip_special_tokens=True).strip()


def _resolve_device(torch, requested: str) -> str:
    if requested != "auto":
        return requested
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def load_backend(config: Settings = settings):
    if config.backend == "template":
        return TemplateBackend()

    try:
        return TransformersBackend(config)
    except Exception as error:  # noqa: BLE001 - any load failure must stay serviceable
        if config.backend == "transformers":
            raise
        log.warning("falling back to the template backend: %s", error)
        return TemplateBackend()
