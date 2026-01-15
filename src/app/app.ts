import { Component, signal, effect, AfterViewInit, QueryList, ViewChildren, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type Player = { id: string; name: string; team: 0 | 1 };
type Round = { bids: Record<string, number | null>; wins: Record<string, number | null> };
type GameState = {
  id: string;
  name: string;
  createdAt: number;
  players: Player[];
  rounds: Round[];
  currentRound: number;
  enforceTotal13: boolean;
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements AfterViewInit {
  private readonly storageKey = 'spades-scorekeeper';
  private readonly isBrowser = typeof window !== 'undefined';

  protected game = signal<GameState | null>(null);
  protected setupName = signal('');
  protected playingTeams = signal(false);
  protected setupTeam1 = signal<string[]>([]);
  protected setupTeam2 = signal<string[]>([]);
  protected setupSolo = signal<string[]>([]);
  protected enforceTotal = signal(false);
  protected validationMessage = signal('');
  protected toast = signal('');

  @ViewChildren('bidInput') protected bidInputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor() {
    this.restoreGame();

    if (this.isBrowser) {
      effect(() => {
        const snapshot = this.game();
        if (!snapshot) {
          localStorage.removeItem(this.storageKey);
          return;
        }
        localStorage.setItem(this.storageKey, JSON.stringify(snapshot));
      });
    }
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    effect(() => {
      const current = this.game();
      if (!current) return;
      current.currentRound;
      queueMicrotask(() => this.focusFirstBid());
    });
  }

  protected updateSetupPlayer(team: 0 | 1, index: number, value: string) {
    const setter = team === 0 ? this.setupTeam1 : this.setupTeam2;
    setter.update((list) => {
      const clone = [...list];
      clone[index] = value;
      return clone;
    });
  }

  protected addSetupPlayer(team: 0 | 1) {
    const setter = team === 0 ? this.setupTeam1 : this.setupTeam2;
    setter.update((list) => {
      if (this.setupTeam1().length + this.setupTeam2().length >= 12) return list;
      return [...list, ``];
    });
  }

  protected addSoloPlayer() {
    this.setupSolo.update((list) => {
      if (list.length >= 12) return list;
      return [...list, ``];
    });
  }

  protected removeSetupPlayer(team: 0 | 1, index: number) {
    const setter = team === 0 ? this.setupTeam1 : this.setupTeam2;
    setter.update((list) => {
      const clone = [...list];
      clone.splice(index, 1);
      return clone;
    });
  }

  protected removeSoloPlayer(index: number) {
    this.setupSolo.update((list) => {
      const clone = [...list];
      clone.splice(index, 1);
      return clone;
    });
  }

  protected updateSoloPlayer(index: number, value: string) {
    this.setupSolo.update((list) => {
      const clone = [...list];
      clone[index] = value;
      return clone;
    });
  }

  protected startGame() {
    const teamMode = this.playingTeams();
    const team1Names = teamMode
      ? this.setupTeam1().map((n) => n.trim()).filter((n) => n.length > 0)
      : this.setupSolo().map((n) => n.trim()).filter((n) => n.length > 0);
    const team2Names = teamMode ? this.setupTeam2().map((n) => n.trim()).filter((n) => n.length > 0) : [];
    const names = [...team1Names, ...team2Names];

    if (names.length < 2 || names.length > 12) {
      this.validationMessage.set('Add between 2 and 12 players to begin.');
      return;
    }

    const lower = names.map((n) => n.toLowerCase());
    if (new Set(lower).size !== lower.length) {
      this.validationMessage.set('Duplicate player names detected. Please adjust.');
      return;
    }

    const players: Player[] = teamMode
      ? [
          ...team1Names.map((name, idx) => ({
            id: crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}-t1-${idx}`,
            name,
            team: 0 as const
          })),
          ...team2Names.map((name, idx) => ({
            id: crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}-t2-${idx}`,
            name,
            team: 1 as const
          }))
        ]
      : team1Names.map((name, idx) => ({
          id: crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}-solo-${idx}`,
          name,
          team: 0 as const
        }));

    const rounds: Round[] = Array.from({ length: 13 }, () => ({
      bids: Object.fromEntries(players.map((p) => [p.id, null])),
      wins: Object.fromEntries(players.map((p) => [p.id, null]))
    }));

    this.game.set({
      id: crypto.randomUUID ? crypto.randomUUID() : `game-${Date.now()}`,
      name: this.setupName().trim(),
      createdAt: Date.now(),
      players,
      rounds,
      currentRound: 0,
      enforceTotal13: this.enforceTotal()
    });

    this.validationMessage.set('');
    this.toast.set('Game created. Round 1 is ready.');
    queueMicrotask(() => this.focusFirstBid());
  }

  protected resetGame() {
    this.game.set(null);
    this.setupName.set('');
    this.enforceTotal.set(false);
    this.playingTeams.set(false);
    this.setupTeam1.set([]);
    this.setupTeam2.set([]);
    this.setupSolo.set([]);
    this.toast.set('Create a new game to begin.');
  }

  protected currentRoundIndex(): number {
    return this.game()?.currentRound ?? 0;
  }

  protected activeRound(): Round | null {
    const g = this.game();
    if (!g) return null;
    return g.rounds[this.currentRoundIndex()];
  }

  protected roundComplete(roundIndex: number): boolean {
    const g = this.game();
    if (!g) return false;
    const round = g.rounds[roundIndex];
    return g.players.every((p) => round.bids[p.id] !== null && round.wins[p.id] !== null);
  }

  protected goToRound(delta: number) {
    this.game.update((g) => {
      if (!g) return g;
      const next = Math.max(0, Math.min(12, g.currentRound + delta));
      if (next === g.currentRound) return g;
      return { ...g, currentRound: next };
    });
    queueMicrotask(() => this.focusFirstBid());
  }

  protected jumpToRound(index: number) {
    this.game.update((g) => (g ? { ...g, currentRound: index } : g));
    queueMicrotask(() => this.focusFirstBid());
  }

  protected setBid(playerId: string, value: string | number) {
    this.updateRoundValue(playerId, value, 'bids');
  }

  protected setWin(playerId: string, value: string | number) {
    this.updateRoundValue(playerId, value, 'wins');
  }

  private updateRoundValue(
    playerId: string,
    rawValue: string | number,
    field: 'bids' | 'wins'
  ) {
    const parsed = this.normalizeScoreInput(rawValue);
    this.game.update((g) => {
      if (!g) return g;
      const idx = g.currentRound;
      const rounds = g.rounds.map((round, i) => {
        if (i !== idx) return round;
        return {
          ...round,
          [field]: { ...round[field], [playerId]: parsed }
        };
      });
      return { ...g, rounds };
    });
  }

  private normalizeScoreInput(value: string | number): number | null {
    if (value === '' || value === null) return null;
    const num = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(num)) return null;
    return Math.max(0, Math.min(13, Math.trunc(num)));
  }

  protected roundScore(playerId: string, roundIndex: number): number | null {
    const g = this.game();
    if (!g) return null;
    const round = g.rounds[roundIndex];
    const bid = round.bids[playerId];
    const win = round.wins[playerId];
    if (bid === null || win === null) return null;
    if (bid === win) return bid;
    // If overbid, subtract tricks won; if underbid, subtract the bid.
    return win > bid ? -win : -bid;
  }

  protected roundTop3(roundIndex: number): string {
    const g = this.game();
    if (!g) return '';
    const withScores = g.players
      .map((p) => ({ player: p, score: this.roundScore(p.id, roundIndex) }))
      .filter((row) => row.score !== null) as { player: Player; score: number }[];

    if (!withScores.length) return 'No scores yet';
    const top = withScores
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 3)
      .map((row) => `${row.player.name} (${row.score})`);
    return top.join(', ');
  }

  protected totalScore(playerId: string): number {
    const g = this.game();
    if (!g) return 0;
    return g.rounds.reduce((sum, _, idx) => {
      const score = this.roundScore(playerId, idx);
      return sum + (score ?? 0);
    }, 0);
  }

  protected exactMatchCount(playerId: string): number {
    const g = this.game();
    if (!g) return 0;
    return g.rounds.reduce((count, round) => {
      const bid = round.bids[playerId];
      const win = round.wins[playerId];
      return count + (bid !== null && bid === win ? 1 : 0);
    }, 0);
  }

  protected averageBid(playerId: string): number {
    const g = this.game();
    if (!g) return 0;
    const values = g.rounds.map((r) => r.bids[playerId]).filter((n): n is number => n !== null);
    if (!values.length) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  protected averageWin(playerId: string): number {
    const g = this.game();
    if (!g) return 0;
    const values = g.rounds.map((r) => r.wins[playerId]).filter((n): n is number => n !== null);
    if (!values.length) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  protected leaderboard() {
    const g = this.game();
    if (!g) return [];
    return g.players
      .map((p) => ({
        player: p,
        total: this.totalScore(p.id),
        matches: this.exactMatchCount(p.id),
        avgBid: this.averageBid(p.id),
        avgWon: this.averageWin(p.id)
      }))
      .sort((a, b) => b.total - a.total || a.player.name.localeCompare(b.player.name));
  }

  protected roundWinsTotal(roundIndex: number): number {
    const g = this.game();
    if (!g) return 0;
    const round = g.rounds[roundIndex];
    return Object.values(round.wins).reduce<number>((sum, val) => sum + (val ?? 0), 0);
  }

  protected completedRounds(): number {
    const g = this.game();
    if (!g) return 0;
    return g.rounds.filter((_, idx) => this.roundComplete(idx)).length;
  }

  protected isGameComplete(): boolean {
    const g = this.game();
    return !!g && g.rounds.every((_, idx) => this.roundComplete(idx));
  }

  protected downloadJson() {
    const data = this.game();
    if (!data) return;
    this.downloadBlob(JSON.stringify(data, null, 2), 'spades-score.json', 'application/json');
  }

  protected downloadCsv() {
    const g = this.game();
    if (!g) return;
    const header = ['Player', ...g.rounds.map((_, i) => `Round ${i + 1}`), 'Total'];
    const rows = g.players.map((p) => {
      const perRound = g.rounds.map((_, idx) => {
        const score = this.roundScore(p.id, idx);
        return score === null ? '' : score.toString();
      });
      return [p.name, ...perRound, this.totalScore(p.id).toString()];
    });
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    this.downloadBlob(csv, 'spades-score.csv', 'text/csv');
  }

  protected copySummary() {
    const g = this.game();
    if (!g || !this.isBrowser) return;
    const board = this.leaderboard();
    const lines = [
      `Game: ${g.name || 'Untitled'} (${g.players.length} players)`,
      `Completed: ${this.completedRounds()} / 13 rounds`,
      'Leaderboard:'
    ];
    board.forEach((row, i) => {
      lines.push(
        `${i + 1}. ${row.player.name} — ${row.total} pts (matches: ${row.matches}, avg bid: ${row.avgBid.toFixed(
          1
        )}, avg won: ${row.avgWon.toFixed(1)})`
      );
    });
    navigator.clipboard?.writeText(lines.join('\n'));
    this.toast.set('Summary copied to clipboard.');
  }

  protected progressPercent(): number {
    const g = this.game();
    if (!g) return 0;
    return Math.round((this.completedRounds() / g.rounds.length) * 100);
  }

  protected roundHasAllWins(): boolean {
    const g = this.game();
    if (!g) return false;
    const round = g.rounds[g.currentRound];
    return g.players.every((p) => round.wins[p.id] !== null);
  }

  protected roundHasAllBids(): boolean {
    const g = this.game();
    if (!g) return false;
    const round = g.rounds[g.currentRound];
    return g.players.every((p) => round.bids[p.id] !== null);
  }

  private downloadBlob(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private focusFirstBid() {
    if (!this.isBrowser) return;
    if (!this.bidInputs?.length) return;
    const el = this.bidInputs.get(0);
    el?.nativeElement?.focus();
  }

  private restoreGame() {
    if (!this.isBrowser) return;
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as GameState;
      this.game.set(parsed);
    } catch (err) {
      console.error('Could not restore saved game', err);
    }
  }

  protected trackById(_index: number, player: Player) {
    return player.id;
  }

  protected trackByIndex(index: number) {
    return index;
  }

  protected teamPlayers(team: 0 | 1) {
    const g = this.game();
    if (!g) return [];
    return g.players.filter((p) => p.team === team);
  }

  protected teamRoundScore(team: 0 | 1, roundIndex: number): number {
    const players = this.teamPlayers(team);
    return players.reduce((sum, p) => sum + (this.roundScore(p.id, roundIndex) ?? 0), 0);
  }

  protected teamTotalScore(team: 0 | 1): number {
    const players = this.teamPlayers(team);
    return players.reduce((sum, p) => sum + this.totalScore(p.id), 0);
  }

  protected unclaimedTricks(roundIndex: number): number {
    return Math.max(0, 13 - this.roundWinsTotal(roundIndex));
  }

  protected totalPlayersCount(): number {
    return this.playingTeams() ? this.setupTeam1().length + this.setupTeam2().length : this.setupSolo().length;
  }

  protected podium() {
    const lb = this.leaderboard();
    return {
      top3: lb.slice(0, 3),
      rest: lb.slice(3)
    };
  }

  protected emojiForRank(rank: number): string {
    const medals = ['🥇', '🥈', '🥉'];
    if (rank < medals.length) return medals[rank];
    const extras = ['🔥', '🎯', '😎', '👍', '👏', '🙂'];
    return extras[(rank - medals.length) % extras.length];
  }

  protected prepareRematch() {
    const g = this.game();
    if (!g) return;
    const hasTeams = g.players.some((p) => p.team === 1);
    this.playingTeams.set(hasTeams);
    if (hasTeams) {
      this.setupTeam1.set(g.players.filter((p) => p.team === 0).map((p) => p.name));
      this.setupTeam2.set(g.players.filter((p) => p.team === 1).map((p) => p.name));
    } else {
      this.setupSolo.set(g.players.map((p) => p.name));
    }
    this.enforceTotal.set(g.enforceTotal13);
    this.game.set(null);
    this.toast.set('Edit names if needed, then press Start to play again.');
  }
}
