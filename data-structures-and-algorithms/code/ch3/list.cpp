// Singly linked list with unique_ptr ownership: no manual delete, no leaks.
#include <cstddef>
#include <cstdio>
#include <memory>
#include <utility>

template <class T>
class SList {
    struct Node {
        T value;
        std::unique_ptr<Node> next;
    };
    std::unique_ptr<Node> head_;
    std::size_t size_ = 0;

public:
    SList() = default;
    ~SList() {
        // The default destructor recurses once per node and can overflow the stack
        // on a long list. Unlink iteratively instead.
        while (head_) head_ = std::move(head_->next);
    }

    void push_front(T v) {
        head_ = std::make_unique<Node>(Node{std::move(v), std::move(head_)});
        ++size_;
    }
    bool pop_front(T& out) {
        if (!head_) return false;
        out = std::move(head_->value);
        head_ = std::move(head_->next);
        --size_;
        return true;
    }
    void reverse() {                       // O(n) time, O(1) extra space
        std::unique_ptr<Node> prev;
        while (head_) {
            auto next = std::move(head_->next);
            head_->next = std::move(prev);
            prev = std::move(head_);
            head_ = std::move(next);
        }
        head_ = std::move(prev);
    }
    template <class F> void for_each(F f) const {
        for (Node* n = head_.get(); n; n = n->next.get()) f(n->value);
    }
    std::size_t size() const { return size_; }
};

int main() {
    SList<int> s;
    for (int i = 1; i <= 5; ++i) s.push_front(i);   // 5 4 3 2 1
    s.reverse();                                     // 1 2 3 4 5
    s.for_each([](int v) { std::printf("%d ", v); });
    std::printf("\n");

    SList<int> big;
    for (int i = 0; i < 1'000'000; ++i) big.push_front(i);  // safe to destroy thanks to ~SList
}
