"""LRU cache: HashMap + doubly linked list, O(1) get/put."""


class _Node:
    __slots__ = ("key", "value", "prev", "next")

    def __init__(self, key=0, value=0):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None


class LRUCache:
    def __init__(self, capacity: int):
        if capacity < 1:
            raise ValueError("capacity must be positive")
        self.capacity = capacity
        self.nodes = {}
        # Dummy head (most recent) and tail (least recent).
        self.head = _Node()
        self.tail = _Node()
        self.head.next = self.tail
        self.tail.prev = self.head

    def get(self, key: int) -> int:
        node = self.nodes.get(key)
        if node is None:
            return -1
        self._move_to_front(node)
        return node.value

    def put(self, key: int, value: int) -> None:
        node = self.nodes.get(key)
        if node is not None:
            node.value = value
            self._move_to_front(node)
            return

        if len(self.nodes) == self.capacity:
            lru = self.tail.prev
            self._unlink(lru)
            del self.nodes[lru.key]

        node = _Node(key, value)
        self.nodes[key] = node
        self._link_after_head(node)

    def _move_to_front(self, node: _Node) -> None:
        self._unlink(node)
        self._link_after_head(node)

    def _unlink(self, node: _Node) -> None:
        node.prev.next = node.next
        node.next.prev = node.prev

    def _link_after_head(self, node: _Node) -> None:
        first = self.head.next
        node.prev = self.head
        node.next = first
        self.head.next = node
        first.prev = node


if __name__ == "__main__":
    cache = LRUCache(2)
    cache.put(1, 1)
    cache.put(2, 2)
    assert cache.get(1) == 1
    cache.put(3, 3)
    assert cache.get(2) == -1
    cache.put(4, 4)
    assert cache.get(1) == -1
    assert cache.get(3) == 3
    assert cache.get(4) == 4
    print("LRUCache checks passed")
