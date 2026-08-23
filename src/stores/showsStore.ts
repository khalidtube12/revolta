import { create } from 'zustand';
import { getAllShows, createShow, updateShow, deleteShow } from '../services/shows.service';
import { getAllMatches, createMatch, updateMatch, deleteMatch } from '../services/matches.service';
import { getAllShowReviews } from '../services/showReviews.service';
import type { Show, Match, ShowReview } from '../types';

interface ShowsState {
  shows: Show[];
  matches: Match[];
  reviews: ShowReview[];
  loading: boolean;

  loadAll: () => Promise<void>;
  loadPublic: () => Promise<void>;

  addShow: (show: Omit<Show, 'id'>) => Promise<string | null>;
  editShow: (id: string, data: Partial<Omit<Show, 'id'>>) => Promise<void>;
  removeShow: (id: string) => Promise<void>;

  addMatch: (match: Omit<Match, 'id'>) => Promise<string | null>;
  editMatch: (id: string, data: Partial<Omit<Match, 'id'>>) => Promise<void>;
  removeMatch: (id: string) => Promise<void>;
}

export const useShowsStore = create<ShowsState>((set) => ({
  shows: [],
  matches: [],
  reviews: [],
  loading: false,

  loadAll: async () => {
    set({ loading: true });
    const [shows, matches, reviews] = await Promise.all([
      getAllShows(),
      getAllMatches(),
      getAllShowReviews(),
    ]);
    set({ shows, matches, reviews, loading: false });
  },

  loadPublic: async () => {
    set({ loading: true });
    const [shows, matches, reviews] = await Promise.all([
      getAllShows(),
      getAllMatches(),
      getAllShowReviews(),
    ]);
    set({ shows: shows.filter(s => s.published), matches, reviews, loading: false });
  },

  addShow: async (show) => {
    const id = await createShow(show);
    const shows = await getAllShows();
    set({ shows });
    return id;
  },

  editShow: async (id, data) => {
    await updateShow(id, data);
    const shows = await getAllShows();
    set({ shows });
  },

  removeShow: async (id) => {
    await deleteShow(id);
    const shows = await getAllShows();
    set({ shows });
  },

  addMatch: async (match) => {
    const id = await createMatch(match);
    const matches = await getAllMatches();
    set({ matches });
    return id;
  },

  editMatch: async (id, data) => {
    await updateMatch(id, data);
    const matches = await getAllMatches();
    set({ matches });
  },

  removeMatch: async (id) => {
    await deleteMatch(id);
    const matches = await getAllMatches();
    set({ matches });
  },
}));
