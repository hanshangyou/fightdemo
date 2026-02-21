export function key(col, row) {
    return `${col},${row}`;
}

export function parseKey(k) {
    const [c, r] = k.split(',').map(Number);
    return { col: c, row: r };
}

export function offsetToAxial(col, row) {
    const r = row - Math.floor((col - (col & 1)) / 2);
    return { q: col, r };
}

export function axialToOffset(q, r) {
    const row = r + Math.floor((q - (q & 1)) / 2);
    return { col: q, row };
}

export function hexDistance(a, b) {
    const ac = offsetToAxial(a.col, a.row);
    const bc = offsetToAxial(b.col, b.row);
    const dq = ac.q - bc.q;
    const dr = ac.r - bc.r;
    const ds = (ac.q + ac.r) - (bc.q + bc.r);
    return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));
}

export function getNeighbors(col, row) {
    const odd = Math.abs(col) % 2 === 1;
    const offsets = odd
        ? [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]]
        : [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]];
    return offsets.map(([dc, dr]) => ({ col: col + dc, row: row + dr }));
}
