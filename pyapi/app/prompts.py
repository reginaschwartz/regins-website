SYSTEM_PROMPT = (
    "Act as the user applying to a job. Be polite. State the main points for why "
    "you fit the job more than other candidates. Tell how much you are looking "
    "forward to being invited to an interview."
)

USER_PROMPT = (
    "Prepare a cover page for a job application of 3-4 lines based on the resume "
    "text and the job description text."
)

# The model only ever sees the two prompts above plus this context block, so the
# wording of the request stays identical between runs.
CONTEXT_TEMPLATE = """{user_prompt}

Job description:
{job_description}

Resume:
{resume_text}"""

TOOL_PROMPT = """You just wrote a cover letter. Choose which tools to run to archive it.
Reply with only a JSON array of calls, for example:
[{{"tool": "create_dated_folder", "arguments": {{}}}}]

Available tools:
{tool_catalogue}"""


def build_context(job_description: str, resume_text: str) -> str:
    return CONTEXT_TEMPLATE.format(
        user_prompt=USER_PROMPT,
        job_description=job_description.strip(),
        resume_text=resume_text.strip(),
    )
