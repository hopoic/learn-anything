// Unbalanced binary search tree: insert, contains, lower_bound, in-order walk, height.
#include <algorithm>
#include <cstdio>
#include <map>
#include <memory>
#include <random>
#include <vector>

class BST {
    struct Node {
        int key;
        std::unique_ptr<Node> left, right;
    };
    std::unique_ptr<Node> root_;

    static int height(const Node* n) {
        return n ? 1 + std::max(height(n->left.get()), height(n->right.get())) : 0;
    }
    template <class F> static void inorder(const Node* n, F& f) {
        if (!n) return;
        inorder(n->left.get(), f);
        f(n->key);
        inorder(n->right.get(), f);
    }

public:
    bool insert(int key) {
        std::unique_ptr<Node>* link = &root_;    // the owning link we are about to fill
        while (*link) {
            if (key == (*link)->key) return false;
            link = key < (*link)->key ? &(*link)->left : &(*link)->right;
        }
        *link = std::make_unique<Node>(Node{key, nullptr, nullptr});
        return true;
    }
    bool contains(int key) const {
        const Node* n = root_.get();
        while (n && n->key != key) n = key < n->key ? n->left.get() : n->right.get();
        return n != nullptr;
    }
    // Smallest key >= x: the query that hash tables cannot answer.
    const int* lower_bound(int x) const {
        const Node* n = root_.get();
        const int* best = nullptr;
        while (n) {
            if (n->key >= x) { best = &n->key; n = n->left.get(); }
            else n = n->right.get();
        }
        return best;
    }
    template <class F> void for_each(F f) const { inorder(root_.get(), f); }
    int height() const { return height(root_.get()); }
};

int main() {
    const int n = 1023;
    std::vector<int> keys(n);
    for (int i = 0; i < n; ++i) keys[i] = i * 2;     // even numbers 0..2044

    BST sorted_tree, random_tree;
    for (int k : keys) sorted_tree.insert(k);        // worst case: degenerates to a list
    std::shuffle(keys.begin(), keys.end(), std::mt19937{7});
    for (int k : keys) random_tree.insert(k);
    std::printf("height after sorted inserts: %d\n", sorted_tree.height());
    std::printf("height after random inserts: %d\n", random_tree.height());
    std::printf("perfectly balanced height:   10\n");

    const int* lb = random_tree.lower_bound(501);
    std::printf("lower_bound(501) = %d\n", lb ? *lb : -1);

    // std::map is a red-black tree: height stays O(log n) for any insertion order.
    std::map<int, const char*> timeline{{100, "boot"}, {250, "localize"}, {900, "dock"}};
    auto it = timeline.lower_bound(300);             // first event at t >= 300
    std::printf("next event after t=300: %s at %d\n", it->second, it->first);
}
