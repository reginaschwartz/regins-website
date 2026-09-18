package org.example.cache;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Fixed-capacity cache that discards the least recently used entry once it is full.
 *
 * <p>A {@link HashMap} gives constant time lookup, and a doubly linked list keeps the
 * entries ordered by recency, so {@link #get(Object)} and {@link #put(Object, Object)}
 * both run in O(1). Reading or writing an entry promotes it to the most recently used
 * position; the entry that falls off the opposite end is the one evicted.
 *
 * <p>Neither keys nor values may be {@code null}. That restriction is what lets
 * {@link #get(Object)} use {@code null} to mean "not cached" without ambiguity.
 *
 * <p>This class is <strong>not</strong> thread-safe. Guard it externally when sharing it
 * across threads, or use a concurrent cache such as Caffeine instead.
 *
 * @param <K> type of the cache keys
 * @param <V> type of the cached values
 */
public final class LruCache<K, V> {

    private final int capacity;
    private final Map<K, Node<K, V>> nodes;

    /** Sentinels: real entries live strictly between them, most recent first. */
    private final Node<K, V> head = new Node<>(null, null);
    private final Node<K, V> tail = new Node<>(null, null);

    /**
     * @param capacity maximum number of entries to retain, at least one
     * @throws IllegalArgumentException if {@code capacity} is not positive
     */
    public LruCache(int capacity) {
        if (capacity < 1) {
            throw new IllegalArgumentException("capacity must be positive, but was " + capacity);
        }
        this.capacity = capacity;
        this.nodes = HashMap.newHashMap(capacity);
        this.head.next = this.tail;
        this.tail.prev = this.head;
    }

    /**
     * Returns the cached value and marks the entry as most recently used.
     *
     * @param key key to look up, not {@code null}
     * @return the cached value, or {@code null} if the key is not cached
     */
    public V get(K key) {
        Objects.requireNonNull(key, "key");

        Node<K, V> node = nodes.get(key);
        if (node == null) {
            return null;
        }

        moveToFront(node);
        return node.value;
    }

    /**
     * Stores a value, evicting the least recently used entry if the cache is full.
     * Replacing an existing key updates its value and marks it most recently used
     * rather than evicting anything.
     *
     * @param key   key to store under, not {@code null}
     * @param value value to cache, not {@code null}
     * @return the value previously cached under {@code key}, or {@code null} if there was none
     */
    public V put(K key, V value) {
        Objects.requireNonNull(key, "key");
        Objects.requireNonNull(value, "value");

        Node<K, V> existing = nodes.get(key);
        if (existing != null) {
            V previous = existing.value;
            existing.value = value;
            moveToFront(existing);
            return previous;
        }

        if (nodes.size() == capacity) {
            evictLeastRecentlyUsed();
        }

        Node<K, V> node = new Node<>(key, value);
        nodes.put(key, node);
        linkAfterHead(node);
        return null;
    }

    /**
     * Reports whether a key is cached <em>without</em> affecting its recency, so it is
     * safe to call from monitoring code.
     *
     * @param key key to look for, not {@code null}
     * @return {@code true} if the key is currently cached
     */
    public boolean containsKey(K key) {
        Objects.requireNonNull(key, "key");
        return nodes.containsKey(key);
    }

    /**
     * Removes an entry.
     *
     * @param key key to drop, not {@code null}
     * @return the value that was cached, or {@code null} if the key was not cached
     */
    public V remove(K key) {
        Objects.requireNonNull(key, "key");

        Node<K, V> node = nodes.remove(key);
        if (node == null) {
            return null;
        }

        unlink(node);
        return node.value;
    }

    /** Discards every entry, keeping the configured capacity. */
    public void clear() {
        nodes.clear();
        head.next = tail;
        tail.prev = head;
    }

    /** @return the number of entries currently cached */
    public int size() {
        return nodes.size();
    }

    /** @return the maximum number of entries this cache retains */
    public int capacity() {
        return capacity;
    }

    /** @return {@code true} if nothing is cached */
    public boolean isEmpty() {
        return nodes.isEmpty();
    }

    /**
     * Returns the cached keys ordered from most to least recently used. The last key is
     * the one that would be evicted next.
     *
     * @return a snapshot of the keys, newest first
     */
    public List<K> keysMostRecentFirst() {
        List<K> keys = new ArrayList<>(nodes.size());
        for (Node<K, V> node = head.next; node != tail; node = node.next) {
            keys.add(node.key);
        }
        return keys;
    }

    @Override
    public String toString() {
        return "LruCache{size=" + nodes.size() + ", capacity=" + capacity
                + ", keysMostRecentFirst=" + keysMostRecentFirst() + '}';
    }

    private void evictLeastRecentlyUsed() {
        Node<K, V> leastRecent = tail.prev;
        unlink(leastRecent);
        nodes.remove(leastRecent.key);
    }

    private void moveToFront(Node<K, V> node) {
        unlink(node);
        linkAfterHead(node);
    }

    private void unlink(Node<K, V> node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    private void linkAfterHead(Node<K, V> node) {
        Node<K, V> first = head.next;
        node.prev = head;
        node.next = first;
        head.next = node;
        first.prev = node;
    }

    /** Mutable list cell, so it cannot be a record. */
    private static final class Node<K, V> {
        private final K key;
        private V value;
        private Node<K, V> prev;
        private Node<K, V> next;

        private Node(K key, V value) {
            this.key = key;
            this.value = value;
        }
    }
}
