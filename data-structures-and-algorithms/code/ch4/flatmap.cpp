// Open-addressing hash map with linear probing and tombstones.
// Flat storage = one array, cache-friendly probing. Same idea as SwissTable
// (Abseil, Rust's hashbrown) minus the SIMD metadata tricks.
#include <cstdint>
#include <cstdio>
#include <functional>
#include <optional>
#include <string>
#include <vector>

template <class K, class V, class Hash = std::hash<K>>
class FlatMap {
    enum class State : unsigned char { Empty, Full, Deleted };
    struct Slot { State state = State::Empty; K key{}; V value{}; };

    std::vector<Slot> slots_ = std::vector<Slot>(8);   // size is always a power of two
    std::size_t size_ = 0, used_ = 0;                  // used_ = Full + Deleted (tombstones)
    Hash hash_;

    std::size_t home(const K& key) const {
        // std::hash<int> is the identity on common implementations, and masking keeps
        // only the low bits. Mix all bits first (MurmurHash3 finalizer).
        std::uint64_t h = hash_(key);
        h ^= h >> 33; h *= 0xff51afd7ed558ccdULL; h ^= h >> 33;
        return static_cast<std::size_t>(h) & (slots_.size() - 1);
    }

    // Returns the slot holding key, or the best slot to insert it into.
    std::size_t probe(const K& key, bool& found) const {
        std::size_t i = home(key);
        std::optional<std::size_t> first_tomb;
        for (;;) {
            const Slot& s = slots_[i];
            if (s.state == State::Empty) { found = false; return first_tomb.value_or(i); }
            if (s.state == State::Deleted) { if (!first_tomb) first_tomb = i; }
            else if (s.key == key) { found = true; return i; }
            i = (i + 1) & (slots_.size() - 1);    // linear probing: next slot, wrap around
        }
    }

    void rehash(std::size_t new_cap) {
        std::vector<Slot> old = std::move(slots_);
        slots_ = std::vector<Slot>(new_cap);
        size_ = used_ = 0;
        for (auto& s : old)
            if (s.state == State::Full) insert(std::move(s.key), std::move(s.value));
    }

public:
    void insert(K key, V value) {
        // Keep load (tombstones included) under 70%, or probe chains explode.
        if ((used_ + 1) * 10 > slots_.size() * 7)
            // Mostly live entries: grow. Mostly tombstones: rebuild at the same size.
            rehash(size_ + 1 > slots_.size() / 2 ? slots_.size() * 2 : slots_.size());
        bool found;
        std::size_t i = probe(key, found);
        Slot& s = slots_[i];
        if (found) { s.value = std::move(value); return; }
        if (s.state == State::Empty) ++used_;      // reusing a tombstone does not raise used_
        s = Slot{State::Full, std::move(key), std::move(value)};
        ++size_;
    }

    V* find(const K& key) {
        bool found;
        std::size_t i = probe(key, found);
        return found ? &slots_[i].value : nullptr;
    }

    bool erase(const K& key) {
        bool found;
        std::size_t i = probe(key, found);
        if (!found) return false;
        slots_[i].state = State::Deleted;          // not Empty: that would cut probe chains
        --size_;
        return true;
    }

    std::size_t size() const { return size_; }
    std::size_t capacity() const { return slots_.size(); }
};

int main() {
    FlatMap<std::string, int> m;
    const char* words[] = {"nav", "perception", "power", "nav", "dds", "nav", "power"};
    for (const char* w : words) {
        if (int* c = m.find(w)) ++*c;
        else m.insert(w, 1);
    }
    m.erase("dds");
    for (const char* w : {"nav", "power", "dds"}) {
        int* c = m.find(w);
        std::printf("%-6s -> %d\n", w, c ? *c : 0);
    }
    std::printf("size=%zu capacity=%zu\n", m.size(), m.capacity());

    FlatMap<int, int> big;                          // stress: insert, erase, re-insert
    for (int i = 0; i < 100000; ++i) big.insert(i * 1024, i);
    for (int i = 0; i < 100000; i += 2) big.erase(i * 1024);
    int ok = 0;
    for (int i = 0; i < 100000; ++i) ok += (big.find(i * 1024) != nullptr) == (i % 2 == 1);
    std::printf("stress: %d/100000 correct, size=%zu\n", ok, big.size());
}
