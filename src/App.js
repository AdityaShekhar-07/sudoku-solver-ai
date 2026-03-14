import React, { useState, useEffect, useRef } from 'react';
import { solveWithLogs, createPuzzle, isValid, getMRVCell } from './utils/solver';

function App() {
  const [view, setView] = useState('landing'); 
  const [grid, setGrid] = useState(Array.from({ length: 9 }, () => Array(9).fill(0)));
  const [isSolving, setIsSolving] = useState(false);
  const [speed, setSpeed] = useState(50);
  const [status, setStatus] = useState('playing'); 
  const [difficulty, setDifficulty] = useState('easy');
  const [hasSolvedOnce, setHasSolvedOnce] = useState(false);
  const [prefilledCells, setPrefilledCells] = useState([]);
  const [lockedCells, setLockedCells] = useState([]);

  const handleBack = () => {
    if (isSolving) return;
    setView('landing');
    setStatus('playing');
    setHasSolvedOnce(false);
    setPrefilledCells([]);
  };

  const startInputMode = () => {
    setGrid(Array.from({ length: 9 }, () => Array(9).fill(0)));
    setView('game');
    setStatus('playing');
    setHasSolvedOnce(false);
    setPrefilledCells([]);
  };

  const selectDifficulty = (diff) => {
    setDifficulty(diff);
    const newPuzzle = createPuzzle(diff);
    setGrid(newPuzzle);
    const fixed = [];
    newPuzzle.forEach((row, r) => {
      row.forEach((val, c) => { if (val !== 0) fixed.push(`${r}-${c}`); });
    });
    setPrefilledCells(fixed);
    setView('game');
    setStatus('playing');
    setHasSolvedOnce(false);
  };

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-7xl font-black text-blue-500 mb-2 tracking-tighter italic uppercase">SUDOKU AI</h1>
        <p className="text-slate-500 mb-12 text-lg font-medium tracking-wide">An Agentic Constraint Satisfaction Visualizer</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          <button onClick={() => setView('difficulty')} className="bg-slate-800 border-2 border-slate-700 p-8 rounded-3xl hover:border-blue-500 transition-all text-left shadow-lg">
            <span className="text-4xl">🎲</span>
            <h2 className="text-2xl font-bold mt-4">Generate Puzzle</h2>
            <p className="text-slate-400 text-sm mt-2">Locked prefilled grids.</p>
          </button>
          <button onClick={startInputMode} className="bg-slate-800 border-2 border-slate-700 p-8 rounded-3xl hover:border-blue-500 transition-all text-left shadow-lg">
            <span className="text-4xl">✍️</span>
            <h2 className="text-2xl font-bold mt-4">Manual Input</h2>
            <p className="text-slate-400 text-sm mt-2">Fully editable starting board.</p>
          </button>
        </div>
      </div>
    );
  }

  if (view === 'difficulty') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <h2 className="text-3xl font-bold mb-8 uppercase tracking-widest text-blue-400">Select Level</h2>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button onClick={() => selectDifficulty('easy')} className="bg-green-600 hover:bg-green-500 py-5 rounded-2xl font-black text-xl transition-all">EASY</button>
          <button onClick={() => selectDifficulty('medium')} className="bg-yellow-600 hover:bg-yellow-500 py-5 rounded-2xl font-black text-xl transition-all">MEDIUM</button>
          <button onClick={() => selectDifficulty('hard')} className="bg-red-600 hover:bg-red-500 py-5 rounded-2xl font-black text-xl transition-all">HARD</button>
          <button onClick={() => setView('landing')} className="text-slate-500 mt-6 hover:text-white transition">Back</button>
        </div>
      </div>
    );
  }

  return (
    <GameView 
      grid={grid} setGrid={setGrid} isSolving={isSolving} setIsSolving={setIsSolving} 
      speed={speed} setSpeed={setSpeed} handleBack={handleBack}
      status={status} setStatus={setStatus} hasSolvedOnce={hasSolvedOnce} setHasSolvedOnce={setHasSolvedOnce}
      difficulty={difficulty} prefilledCells={prefilledCells} setPrefilledCells={setPrefilledCells}
      lockedCells={lockedCells} setLockedCells={setLockedCells} // <--- ADD THIS LINE
    />
  );
}

function GameView({ 
  grid, setGrid, isSolving, setIsSolving, speed, setSpeed, 
  handleBack, status, setStatus, hasSolvedOnce, setHasSolvedOnce, 
  difficulty, prefilledCells, setPrefilledCells,
  lockedCells, setLockedCells // <--- RECEIVE THEM HERE TOO
}) {
  const [logs, setLogs] = useState([]);
  const [accuracy, setAccuracy] = useState(100);
  const [currentAction, setCurrentAction] = useState(null);
  const [hintsLeft, setHintsLeft] = useState(3);
  const stopRef = useRef(false);

  useEffect(() => {
    let correct = 0, totalInput = 0, isFull = true;
    grid.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val !== 0) {
          totalInput++;
          const tempGrid = [...grid.map(row => [...row])];
          tempGrid[r][c] = 0;
          if (isValid(tempGrid, r, c, val)) correct++;
        } else isFull = false;
      });
    });
    setAccuracy(totalInput === 0 ? 100 : Math.round((correct / totalInput) * 100));
    if (isFull && !isSolving) setStatus('solved');
  }, [grid, isSolving, setStatus]);

  // Inside GameView in App.js
const triggerSolve = async () => {
  if (isSolving) return;
  setIsSolving(true);
  setStatus('playing');
  stopRef.current = false;
  
  let result = await solveWithLogs(
    [...grid.map(r => [...r])], 
    setGrid, 
    speed, 
    setLogs, 
    () => stopRef.current, 
    setCurrentAction,
    prefilledCells 
  );

  // If the AI hit a dead end due to manual input, we clear and try once more
  if (result && result.retryNeeded) {
      const newGrid = [...grid.map(r => [...r])];
      // Find the last non-prefilled cell and clear it
      for (let r = 8; r >= 0; r--) {
          for (let c = 8; c >= 0; c--) {
              if (newGrid[r][c] !== 0 && !prefilledCells.includes(`${r}-${c}`)) {
                  newGrid[r][c] = 0;
                  break;
              }
          }
      }
      result = await solveWithLogs(newGrid, setGrid, speed, setLogs, () => stopRef.current, setCurrentAction, prefilledCells);
  }

  setIsSolving(false);
  if (result && result.solved) {
    setStatus('solved');
    setHasSolvedOnce(true);
    const all = [];
    for(let r=0; r<9; r++) for(let c=0; c<9; c++) all.push(`${r}-${c}`);
    setLockedCells(all);
  }
};

  const handleHint = () => {
    if (hintsLeft <= 0 || isSolving || status === 'solved') {
        if (hintsLeft <= 0) alert("No more hints left!");
        return;
    }
    const solutionGrid = grid.map(row => [...row]);
    const fillSolution = (g) => {
      const cell = getMRVCell(g);
      if (!cell || cell.deadEnd) return !cell;
      const { r, c } = cell;
      for (let k = 1; k <= 9; k++) {
        if (isValid(g, r, c, k)) {
          g[r][c] = k;
          if (fillSolution(g)) return true;
          g[r][c] = 0;
        }
      }
      return false;
    };

    if (fillSolution(solutionGrid)) {
      const emptyCells = [];
      grid.forEach((row, r) => {
        row.forEach((val, c) => { if (val === 0) emptyCells.push({ r, c }); });
      });
      if (emptyCells.length > 0) {
        const rand = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const newVal = solutionGrid[rand.r][rand.c];
        const newGrid = [...grid.map(row => [...row])];
        newGrid[rand.r][rand.c] = newVal;
        setGrid(newGrid);
        setPrefilledCells(prev => [...prev, `${rand.r}-${rand.c}`]);
        setHintsLeft(prev => prev - 1);
      }
    } else {
        alert("The board has a conflict! AI cannot provide a hint.");
    }
  };

  const handleRegenerate = () => {
    if (isSolving) return;
    const newPuzzle = createPuzzle(difficulty);
    setGrid(newPuzzle);
    const fixed = [];
    newPuzzle.forEach((row, r) => {
      row.forEach((val, c) => { if (val !== 0) fixed.push(`${r}-${c}`); });
    });
    setPrefilledCells(fixed);
    setStatus('playing');
    setHasSolvedOnce(false);
    setHintsLeft(3);
    setLogs([]);
  };

  return (
    <div className={`min-h-screen transition-all duration-1000 p-4 md:p-10 relative overflow-hidden ${status === 'solved' ? 'bg-green-950' : 'bg-slate-900'}`}>
      
      <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[60] transition-all duration-700 ease-out ${status === 'solved' ? 'translate-y-0 opacity-100' : '-translate-y-28 opacity-0'}`}>
          <div className="bg-green-600 border-2 border-green-400 px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
            <span className="text-2xl animate-bounce">🏆</span>
            <div><p className="font-black text-white uppercase text-sm">Solved!</p></div>
            <button onClick={handleRegenerate} className="ml-4 bg-white text-green-700 px-4 py-2 rounded-lg font-bold text-xs hover:bg-slate-100 transition shadow-md">NEW GAME</button>
          </div>
      </div>

      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-10 items-start pt-10 text-white">
        <div className="flex-1 flex flex-col items-center">
          <div className="flex justify-between w-full mb-4 items-center px-2">
            <button onClick={handleBack} className="text-slate-500 hover:text-white font-bold transition">← EXIT</button>
            <button onClick={handleHint} className={`px-6 py-2 rounded-full font-black text-[10px] uppercase transition-all border-2 ${hintsLeft > 0 ? 'bg-yellow-500 border-yellow-400 text-slate-900 hover:scale-105' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                💡 Hint ({hintsLeft})
            </button>
            <div className="bg-slate-800 px-5 py-2 rounded-full border border-slate-700 flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-500 uppercase">Accuracy</span>
              <span className={`text-xl font-mono font-bold ${accuracy < 100 ? 'text-red-500' : 'text-green-500'}`}>{accuracy}%</span>
            </div>
          </div>

          <div className="bg-white p-1.5 rounded-2xl shadow-2xl">
            <div className="grid grid-cols-9 border-[3px] border-black overflow-hidden rounded-lg">
              {grid.map((row, rIdx) => row.map((val, cIdx) => {
                const isPrefilled = prefilledCells.includes(`${rIdx}-${cIdx}`);
                const isCurrent = currentAction?.r === rIdx && currentAction?.c === cIdx;
                const isFinalSolved = status === 'solved';

                let bgColor = "bg-white";
                if (isFinalSolved) bgColor = "bg-green-100";
                else if (isCurrent && currentAction.type === 'setting') bgColor = "bg-yellow-200";
                else if (isCurrent && currentAction.type === 'backtrack') bgColor = "bg-red-300";
                else if (isPrefilled) bgColor = "bg-slate-100"; 

                return (
                  <input
                    key={`${rIdx}-${cIdx}`}
                    type="number"
                    value={val === 0 ? "" : val}
                    readOnly={isPrefilled || isSolving || isFinalSolved}
                    onChange={(e) => {
                      const n = parseInt(e.target.value) || 0;
                      if (n >= 0 && n <= 9) {
                        const newGrid = [...grid.map(r => [...r])];
                        newGrid[rIdx][cIdx] = n;
                        setGrid(newGrid);
                      }
                    }}
                    className={`w-9 h-9 sm:w-14 sm:h-14 text-center text-2xl border border-slate-200 text-black focus:outline-none transition-colors duration-100
                      ${bgColor}
                      ${isPrefilled ? 'font-black' : 'font-medium'}
                      ${cIdx % 3 === 2 && cIdx !== 8 ? 'border-r-[3px] border-r-black' : ''}
                      ${rIdx % 3 === 2 && rIdx !== 8 ? 'border-b-[3px] border-b-black' : ''}
                    `}
                  />
                );
              }))}
            </div>
          </div>

          <div className="mt-10 w-full max-w-md flex flex-col gap-6 px-4">
            <div className="bg-slate-800 p-5 rounded-3xl border border-slate-700">
              <div className="flex justify-between text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest">
                <span>Fast</span><span>Speed: {speed}ms</span><span>Slow</span>
              </div>
              <input type="range" min="1" max="500" value={speed} onChange={(e) => setSpeed(e.target.value)} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
            </div>
            <div className="flex gap-4">
              <button 
                onClick={isSolving ? () => { stopRef.current = true; } : triggerSolve} 
                className={`flex-1 py-5 rounded-[2rem] font-black uppercase tracking-widest transition-all shadow-xl ${isSolving ? 'bg-red-600 shadow-red-600/20' : 'bg-blue-600 shadow-blue-600/20'}`}
              >
                {isSolving ? 'Stop AI' : !hasSolvedOnce ? 'Solve with AI' : 'Continue with AI'}
              </button>
              {!isSolving && (
                <button onClick={handleRegenerate} className="px-6 py-5 bg-slate-800 border border-slate-700 rounded-[2rem] hover:bg-slate-700 transition shadow-lg flex items-center justify-center text-xl">
                    🔄
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-96 bg-slate-800/50 border border-slate-700/50 rounded-[2.5rem] p-8 shadow-2xl backdrop-blur-md">
          <h3 className="text-xs font-black mb-6 flex items-center gap-3 text-slate-400 uppercase tracking-widest">
            <span className={`h-2 w-2 rounded-full ${isSolving ? 'bg-blue-500 animate-pulse' : 'bg-slate-600'}`}></span>
            AI Steps
          </h3>
          <div className="h-[400px] overflow-y-auto pr-2 custom-scrollbar font-mono text-[10px] space-y-2">
            {logs.map((log, i) => (
              <div key={i} className={`p-3 rounded-xl border flex justify-between ${log.status === 'Backtrack' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                <span className="font-bold">CELL {log.cell}</span>
                <span className="uppercase opacity-80 font-black tracking-tighter">{log.action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;