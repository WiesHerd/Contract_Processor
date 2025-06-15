import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Clause } from '@/types/clause';

interface ClauseState {
  clauses: Clause[];
  loading: boolean;
  error: string | null;
}

const initialState: ClauseState = {
  clauses: [],
  loading: false,
  error: null,
};

const clauseSlice = createSlice({
  name: 'clauses',
  initialState,
  reducers: {
    setClauses: (state, action: PayloadAction<Clause[]>) => {
      state.clauses = action.payload;
    },
    addClause: (state, action: PayloadAction<Clause>) => {
      state.clauses.push(action.payload);
    },
    updateClause: (state, action: PayloadAction<Clause>) => {
      const index = state.clauses.findIndex(clause => clause.id === action.payload.id);
      if (index !== -1) {
        state.clauses[index] = action.payload;
      }
    },
    deleteClause: (state, action: PayloadAction<string>) => {
      state.clauses = state.clauses.filter(clause => clause.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setClauses, addClause, updateClause, deleteClause, setLoading, setError } = clauseSlice.actions;

export default clauseSlice.reducer; 