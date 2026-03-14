export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const isValid = (grid, r, c, k) => {
  for (let i = 0; i < 9; i++) {
    const m = 3 * Math.floor(r / 3) + Math.floor(i / 3);
    const n = 3 * Math.floor(c / 3) + i % 3;
    if (grid[r][i] === k || grid[i][c] === k || grid[m][n] === k) return false;
  }
  return true;
};

export const getMRVCell = (grid) => {
  let bestCell = null;
  let minChoices = 10;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) {
        let choices = 0;
        for (let k = 1; k <= 9; k++) {
          if (isValid(grid, r, c, k)) choices++;
        }
        if (choices === 0) return { r, c, deadEnd: true };
        if (choices < minChoices) {
          minChoices = choices;
          bestCell = { r, c };
        }
      }
    }
  }
  return bestCell;
};

export async function solveWithLogs(incomingGrid, setGrid, speed, setLogs, isStopRequested, setCurrentAction) {
  // Use a local working copy to avoid React state batching issues
  let g = incomingGrid.map(row => [...row]);

  // PHASE 1: SELF-CORRECTION (Clean existing board)
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (g[r][c] !== 0) {
        const val = g[r][c];
        g[r][c] = 0;
        if (!isValid(g, r, c, val)) {
          setLogs(prev => [{ cell: `(${r+1},${c+1})`, action: `Corrected`, status: 'Backtrack' }, ...prev].slice(0, 15));
        } else {
          g[r][c] = val;
        }
      }
    }
  }
  setGrid([...g.map(row => [...row])]);
  await sleep(speed);

  // PHASE 2: RECURSIVE CSP SOLVER
  const backtrack = async () => {
    if (isStopRequested()) return { solved: false, stopped: true };

    const cellInfo = getMRVCell(g);
    if (!cellInfo) return { solved: true };
    if (cellInfo.deadEnd) return { solved: false };

    const { r, c } = cellInfo;
    for (let k = 1; k <= 9; k++) {
      if (isStopRequested()) return { solved: false, stopped: true };

      if (isValid(g, r, c, k)) {
        g[r][c] = k;
        setCurrentAction({ r, c, type: 'setting' });
        setLogs(prev => [{ cell: `(${r+1},${c+1})`, action: `Set ${k}`, status: 'Success' }, ...prev].slice(0, 15));
        setGrid([...g.map(row => [...row])]);
        await sleep(speed);

        const result = await backtrack();
        if (result.solved || result.stopped) return result;

        g[r][c] = 0;
        setCurrentAction({ r, c, type: 'backtrack' });
        setLogs(prev => [{ cell: `(${r+1},${c+1})`, action: `Backtrack`, status: 'Backtrack' }, ...prev].slice(0, 15));
        setGrid([...g.map(row => [...row])]);
        await sleep(speed);
      }
    }
    return { solved: false };
  };

  const result = await backtrack();
  setCurrentAction(null);
  return { ...result, finalGrid: g };
}

export const createPuzzle = (difficulty) => {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  const fill = (g) => {
    const cell = getMRVCell(g);
    if (!cell || cell.deadEnd) return !cell;
    const { r, c } = cell;
    const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
    for (let n of nums) {
      if (isValid(g, r, c, n)) {
        g[r][c] = n;
        if (fill(g)) return true;
        g[r][c] = 0;
      }
    }
    return false;
  };
  fill(grid);
  const levels = { easy: 30, medium: 45, hard: 55 };
  let removed = 0;
  while (removed < (levels[difficulty] || 35)) {
    const r = Math.floor(Math.random() * 9), c = Math.floor(Math.random() * 9);
    if (grid[r][c] !== 0) { grid[r][c] = 0; removed++; }
  }
  return grid;
};