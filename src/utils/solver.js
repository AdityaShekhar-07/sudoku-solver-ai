export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const isValid = (grid, r, c, k) => {
  for (let i = 0; i < 9; i++) {
    if (grid[r][i] === k || grid[i][c] === k) return false;
  }
  const boxRowStart = Math.floor(r / 3) * 3;
  const boxColStart = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (grid[boxRowStart + i][boxColStart + j] === k) return false;
    }
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

export async function solveWithLogs(incomingGrid, setGrid, speed, setLogs, isStopRequested, setCurrentAction, prefilledCells) {
  let g = incomingGrid.map(row => [...row]);
  
  // 1. IMMEDIATE CLEANING (No awaiting here to keep logic fluid)
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (g[r][c] !== 0 && !prefilledCells.includes(`${r}-${c}`)) {
        const val = g[r][c];
        g[r][c] = 0;
        if (!isValid(g, r, c, val)) {
          setLogs(prev => [{ cell: `(${r+1},${c+1})`, action: `Conflict Resolved`, status: 'Backtrack' }, ...prev].slice(0, 15));
        } else {
          g[r][c] = val;
        }
      }
    }
  }

  // Update the UI once after cleaning
  setGrid([...g.map(row => [...row])]);
  await sleep(speed);

  // 2. CONTINUOUS SOLVER LOOP
  const stack = [];
  let cellInfo = getMRVCell(g);
  
  // If no empty cells and no dead ends, we are done
  if (!cellInfo) return { solved: true, finalGrid: g };
  
  // If the human entries created a mathematical dead end, 
  // we must remove the most recent human entry and try again
  if (cellInfo.deadEnd) {
    setLogs(prev => [{ cell: `System`, action: `Dead End Found`, status: 'Backtrack' }, ...prev].slice(0, 15));
    return { solved: false, retryNeeded: true };
  }

  stack.push({ r: cellInfo.r, c: cellInfo.c, nextNum: 1 });

  while (stack.length > 0) {
    if (isStopRequested()) return { solved: false, stopped: true };

    let current = stack[stack.length - 1];
    let { r, c } = current;
    let found = false;

    for (let k = current.nextNum; k <= 9; k++) {
      current.nextNum = k + 1;
      if (isValid(g, r, c, k)) {
        g[r][c] = k;
        setCurrentAction({ r, c, type: 'setting' });
        setLogs(prev => [{ cell: `(${r+1},${c+1})`, action: `Set ${k}`, status: 'Success' }, ...prev].slice(0, 15));
        setGrid([...g.map(row => [...row])]);
        await sleep(speed);

        let nextCell = getMRVCell(g);
        if (!nextCell) {
          setCurrentAction(null);
          return { solved: true, finalGrid: g };
        }
        
        if (!nextCell.deadEnd) {
          stack.push({ r: nextCell.r, c: nextCell.c, nextNum: 1 });
          found = true;
          break;
        }
      }
    }

    if (!found) {
      setCurrentAction({ r, c, type: 'backtrack' });
      g[r][c] = 0;
      setLogs(prev => [{ cell: `(${r+1},${c+1})`, action: `Backtrack`, status: 'Backtrack' }, ...prev].slice(0, 15));
      setGrid([...g.map(row => [...row])]);
      await sleep(speed);
      stack.pop();
    }
  }
  return { solved: false };
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
  const target = { easy: 30, medium: 45, hard: 55 }[difficulty] || 35;
  let removed = 0;
  while (removed < target) {
    const r = Math.floor(Math.random() * 9), c = Math.floor(Math.random() * 9);
    if (grid[r][c] !== 0) { grid[r][c] = 0; removed++; }
  }
  return grid;
};