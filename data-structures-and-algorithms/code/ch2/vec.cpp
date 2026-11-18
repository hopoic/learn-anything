// A minimal std::vector-like container: the growth policy is the whole story.
#include <cstddef>
#include <cstdio>
#include <new>
#include <string>
#include <utility>

template <class T>
class Vec {
public:
    Vec() = default;
    Vec(const Vec&) = delete;              // keep the example small
    Vec& operator=(const Vec&) = delete;
    ~Vec() { clear(); ::operator delete(data_); }

    void push_back(T value) {
        if (size_ == cap_) grow();
        ::new (data_ + size_) T(std::move(value));   // construct in raw storage
        ++size_;
    }
    void pop_back() { data_[--size_].~T(); }
    void clear() { while (size_) pop_back(); }

    T& operator[](std::size_t i) { return data_[i]; }   // unchecked, like std::vector
    std::size_t size() const { return size_; }
    std::size_t capacity() const { return cap_; }
    std::size_t moves() const { return moves_; }

private:
    void grow() {
        std::size_t new_cap = cap_ ? cap_ * 2 : 4;     // geometric growth => amortized O(1)
        T* p = static_cast<T*>(::operator new(new_cap * sizeof(T)));
        std::size_t i = 0;
        try {
            // Move if T's move cannot throw, otherwise copy (std::vector does the same).
            for (; i < size_; ++i) ::new (p + i) T(std::move_if_noexcept(data_[i]));
        } catch (...) {
            while (i) p[--i].~T();
            ::operator delete(p);
            throw;                                     // old buffer untouched: strong guarantee
        }
        for (std::size_t j = 0; j < size_; ++j) data_[j].~T();
        ::operator delete(data_);
        moves_ += size_;
        data_ = p;
        cap_ = new_cap;
    }

    T* data_ = nullptr;
    std::size_t size_ = 0, cap_ = 0, moves_ = 0;
};

int main() {
    Vec<std::string> v;
    std::size_t last_cap = 0;
    for (int i = 0; i < 1000; ++i) {
        v.push_back("item-" + std::to_string(i));
        if (v.capacity() != last_cap) {
            std::printf("size=%4zu  capacity -> %4zu\n", v.size(), v.capacity());
            last_cap = v.capacity();
        }
    }
    std::printf("1000 pushes, %zu element moves (%.2f per push)\n", v.moves(), v.moves() / 1000.0);
}
