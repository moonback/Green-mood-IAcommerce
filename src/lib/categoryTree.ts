import type { Category, CategoryNode } from './types';

/**
 * Converts a flat array of Category (as returned by Supabase) into a
 * tree of CategoryNode. Handles missing parents gracefully by treating
 * orphaned nodes as root-level categories.
 *
 * @param flat - All categories, flat, in any order.
 * @param includeInactive - If false (default), nodes with is_active=false are excluded.
 *   If a parent is inactive, its children are also excluded (cascade).
 * @returns Root-level CategoryNode[], each with .children populated recursively.
 */
export function buildCategoryTree(
  flat: Category[],
  includeInactive = false
): CategoryNode[] {
  // 1. Determine which ids are visible
  const activeIds = new Set(
    includeInactive
      ? flat.map(c => c.id)
      : flat.filter(c => c.is_active).map(c => c.id)
  );

  // Cascade: exclude children whose parent is inactive
  const visible = flat.filter(
    c => activeIds.has(c.id) && (c.parent_id === null || activeIds.has(c.parent_id))
  );

  // 2. Build O(1) node map
  const nodeMap = new Map<string, CategoryNode>(
    visible.map(c => [c.id, { ...c, children: [] }])
  );

  const roots: CategoryNode[] = [];

  // 3. Wire parent–child relationships
  for (const node of nodeMap.values()) {
    if (node.parent_id === null || !nodeMap.has(node.parent_id)) {
      roots.push(node);
    } else {
      nodeMap.get(node.parent_id)!.children.push(node);
    }
  }

  // 4. Sort each level by sort_order, then name
  const sortNodes = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    nodes.forEach(n => sortNodes(n.children));
  };
  sortNodes(roots);

  return roots;
}

/**
 * Returns a flat ordered list from the tree, suitable for `<select>` dropdowns.
 * Each entry has an `indent` string (`'  '.repeat(depth)`) for visual indentation.
 */
export function flattenTree(
  roots: CategoryNode[]
): Array<CategoryNode & { indent: string }> {
  const result: Array<CategoryNode & { indent: string }> = [];

  const walk = (nodes: CategoryNode[], depth: number) => {
    for (const node of nodes) {
      result.push({ ...node, indent: '  '.repeat(depth) });
      walk(node.children, depth + 1);
    }
  };

  walk(roots, 0);
  return result;
}

/**
 * Returns the ancestry path from root to the given category (inclusive),
 * ordered root → … → target. Used for breadcrumb rendering.
 *
 * Example: [{ name: 'Arcade' }, { name: 'Flippers' }, { name: 'Cocktail' }]
 */
export function getCategoryAncestors(
  categoryId: string,
  flat: Category[]
): Category[] {
  const map = new Map(flat.map(c => [c.id, c]));
  const path: Category[] = [];
  let current = map.get(categoryId);
  while (current) {
    path.unshift(current);
    current = current.parent_id ? map.get(current.parent_id) : undefined;
  }
  return path;
}

/**
 * Returns all ids in the subtree rooted at categoryId (inclusive of self).
 * Used in Catalog to fetch products from a parent category AND all its
 * descendants via `.in('category_id', subtreeIds)`.
 */
export function getCategorySubtreeIds(
  categoryId: string,
  flat: Category[]
): string[] {
  // Build a parent → children map
  const childMap = new Map<string, string[]>();
  for (const c of flat) {
    if (c.parent_id) {
      const siblings = childMap.get(c.parent_id) ?? [];
      siblings.push(c.id);
      childMap.set(c.parent_id, siblings);
    }
  }

  // BFS from root
  const ids: string[] = [];
  const queue = [categoryId];
  while (queue.length) {
    const id = queue.shift()!;
    ids.push(id);
    const children = childMap.get(id);
    if (children) queue.push(...children);
  }
  return ids;
}
