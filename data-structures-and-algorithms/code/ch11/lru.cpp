// LRU cache = hash map (find in O(1)) + doubly linked list (reorder in O(1)).
#include <cstdio>
#include <list>
#include <optional>
#include <string>
#include <unordered_map>
#include <utility>

template <class K, class V>
class LRU {
    using Item = std::pair<K, V>;
    std::list<Item> order_;                                       // front = most recently used
    std::unordered_map<K, typename std::list<Item>::iterator> index_;
    std::size_t cap_;

public:
    explicit LRU(std::size_t cap) : cap_(cap) {}

    std::optional<V> get(const K& k) {
        auto it = index_.find(k);
        if (it == index_.end()) return std::nullopt;
        order_.splice(order_.begin(), order_, it->second);   // O(1); list iterators stay valid
        return it->second->second;
    }
    void put(const K& k, V v) {
        if (auto it = index_.find(k); it != index_.end()) {
            it->second->second = std::move(v);
            order_.splice(order_.begin(), order_, it->second);
            return;
        }
        if (order_.size() == cap_) {                          // evict the least recently used
            index_.erase(order_.back().first);
            order_.pop_back();
        }
        order_.emplace_front(k, std::move(v));
        index_[k] = order_.begin();
    }
};

int main() {
    LRU<std::string, int> tiles(2);           // e.g. decoded map tiles kept in memory
    tiles.put("tile_3_4", 34);
    tiles.put("tile_3_5", 35);
    tiles.get("tile_3_4");                    // touch: 3_4 becomes the most recent
    tiles.put("tile_9_9", 99);                // evicts tile_3_5
    std::printf("tile_3_5 cached? %s\n", tiles.get("tile_3_5") ? "yes" : "no");
    std::printf("tile_3_4 cached? %s\n", tiles.get("tile_3_4") ? "yes" : "no");
}
