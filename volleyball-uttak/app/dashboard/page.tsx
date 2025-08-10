'use client';

import { useEffect, useState } from 'react';
import { auth, db, signOut, onAuthStateChanged } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

const POSITIONS = ['Midt', 'Dia', 'Legger', 'Libero', 'Kant'] as const;

type Position = typeof POSITIONS[number];

interface Player {
  name: string;
}

type Selection = Record<Position, string[]>;

const emptySelection: Selection = {
  Midt: [],
  Dia: [],
  Legger: [],
  Libero: [],
  Kant: [],
};

export default function Dashboard() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selection, setSelection] = useState<Selection>(emptySelection);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) {
        router.replace('/login');
        return;
      }
      const ref = doc(db, 'teams', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) setSelection(snap.data() as Selection);
    });
    fetch('/api/players')
      .then(res => res.json())
      .then(data => setPlayers(data.players));
    return () => unsub();
  }, [router]);

  const updateSelection = async (pos: Position, player: Player) => {
    const newSel: Selection = { ...selection };
    for (const p of POSITIONS) {
      newSel[p] = newSel[p].filter(n => n !== player.name);
    }
    newSel[pos] = [...newSel[pos], player.name];
    setSelection(newSel);
    if (auth.currentUser) {
      await setDoc(doc(db, 'teams', auth.currentUser.uid), newSel);
    }
  };

  const available = players.filter(
    p => !POSITIONS.some(pos => selection[pos].includes(p.name))
  );

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button onClick={() => signOut(auth)} className="text-sm underline">
          Logg ut
        </button>
      </div>
      <section>
        <h2 className="text-xl font-semibold mb-2">Tilgjengelige spillere</h2>
        <ul className="space-y-1">
          {available.map(player => (
            <li key={player.name} className="flex items-center gap-2">
              <span className="flex-1">{player.name}</span>
              <select
                className="border p-1"
                defaultValue=""
                onChange={e => updateSelection(e.target.value as Position, player)}
              >
                <option value="" disabled>
                  Velg posisjon
                </option>
                {POSITIONS.map(pos => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">Laguttak</h2>
        {POSITIONS.map(pos => (
          <div key={pos} className="mb-4">
            <h3 className="font-medium">{pos}</h3>
            <ul className="list-disc ml-5">
              {selection[pos].map(name => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
