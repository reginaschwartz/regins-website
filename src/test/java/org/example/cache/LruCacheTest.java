package org.example.cache;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import java.util.Arrays;
import java.util.Collections;
import org.junit.Test;

public class LruCacheTest {

    @Test
    public void rejectsNonPositiveCapacity() {
        assertThrows(IllegalArgumentException.class, () -> new LruCache<String, String>(0));
        assertThrows(IllegalArgumentException.class, () -> new LruCache<String, String>(-1));
    }

    @Test
    public void returnsNullForAMissingKey() {
        LruCache<String, Integer> cache = new LruCache<>(2);

        assertNull(cache.get("absent"));
        assertTrue(cache.isEmpty());
    }

    @Test
    public void storesAndReadsBackValues() {
        LruCache<String, Integer> cache = new LruCache<>(2);

        assertNull(cache.put("a", 1));
        assertEquals(Integer.valueOf(1), cache.get("a"));
        assertEquals(1, cache.size());
        assertEquals(2, cache.capacity());
    }

    @Test
    public void evictsTheLeastRecentlyUsedEntryWhenFull() {
        LruCache<Integer, Integer> cache = new LruCache<>(2);
        cache.put(1, 1);
        cache.put(2, 2);

        cache.put(3, 3);

        assertNull("key 1 was the least recently used", cache.get(1));
        assertEquals(Integer.valueOf(2), cache.get(2));
        assertEquals(Integer.valueOf(3), cache.get(3));
        assertEquals(2, cache.size());
    }

    @Test
    public void readingAnEntryProtectsItFromEviction() {
        LruCache<Integer, Integer> cache = new LruCache<>(2);
        cache.put(1, 1);
        cache.put(2, 2);

        cache.get(1);
        cache.put(3, 3);

        assertEquals("1 was refreshed by the read", Integer.valueOf(1), cache.get(1));
        assertNull("2 became the least recently used", cache.get(2));
    }

    @Test
    public void replacingAKeyUpdatesTheValueWithoutEvicting() {
        LruCache<String, String> cache = new LruCache<>(2);
        cache.put("a", "first");
        cache.put("b", "second");

        assertEquals("first", cache.put("a", "updated"));

        assertEquals("updated", cache.get("a"));
        assertEquals("second", cache.get("b"));
        assertEquals(2, cache.size());
    }

    @Test
    public void tracksRecencyOrder() {
        LruCache<String, Integer> cache = new LruCache<>(3);
        cache.put("a", 1);
        cache.put("b", 2);
        cache.put("c", 3);

        cache.get("a");

        assertEquals(Arrays.asList("a", "c", "b"), cache.keysMostRecentFirst());
    }

    @Test
    public void containsKeyDoesNotChangeRecency() {
        LruCache<String, Integer> cache = new LruCache<>(2);
        cache.put("a", 1);
        cache.put("b", 2);

        assertTrue(cache.containsKey("a"));
        cache.put("c", 3);

        assertNull("a stayed least recently used despite containsKey", cache.get("a"));
        assertFalse(cache.containsKey("a"));
    }

    @Test
    public void removeDropsTheEntryAndFreesRoom() {
        LruCache<String, Integer> cache = new LruCache<>(2);
        cache.put("a", 1);
        cache.put("b", 2);

        assertEquals(Integer.valueOf(1), cache.remove("a"));
        assertNull(cache.remove("a"));
        assertEquals(1, cache.size());

        cache.put("c", 3);

        assertEquals(Integer.valueOf(2), cache.get("b"));
        assertEquals(Integer.valueOf(3), cache.get("c"));
    }

    @Test
    public void clearEmptiesTheCacheButKeepsCapacity() {
        LruCache<String, Integer> cache = new LruCache<>(2);
        cache.put("a", 1);
        cache.put("b", 2);

        cache.clear();

        assertTrue(cache.isEmpty());
        assertEquals(Collections.emptyList(), cache.keysMostRecentFirst());
        assertEquals(2, cache.capacity());

        cache.put("c", 3);
        assertEquals(Integer.valueOf(3), cache.get("c"));
    }

    @Test
    public void rejectsNullKeysAndValues() {
        LruCache<String, String> cache = new LruCache<>(2);

        assertThrows(NullPointerException.class, () -> cache.put(null, "v"));
        assertThrows(NullPointerException.class, () -> cache.put("k", null));
        assertThrows(NullPointerException.class, () -> cache.get(null));
        assertThrows(NullPointerException.class, () -> cache.remove(null));
        assertThrows(NullPointerException.class, () -> cache.containsKey(null));
    }

    @Test
    public void capacityOfOneKeepsOnlyTheNewestEntry() {
        LruCache<String, Integer> cache = new LruCache<>(1);
        cache.put("a", 1);

        cache.put("b", 2);

        assertNull(cache.get("a"));
        assertEquals(Integer.valueOf(2), cache.get("b"));
        assertEquals(1, cache.size());
    }

    @Test
    public void evictionKeepsTheListConsistentUnderChurn() {
        LruCache<Integer, Integer> cache = new LruCache<>(3);

        for (int i = 0; i < 100; i++) {
            cache.put(i, i * 10);
        }

        assertEquals(3, cache.size());
        assertEquals(Arrays.asList(99, 98, 97), cache.keysMostRecentFirst());
        assertEquals(Integer.valueOf(970), cache.get(97));
        assertNull(cache.get(96));
    }
}
