import snackbarReducer from '../store/slices/snackbarSlice'
import loadingReducer from '../store/slices/loadingSlice'
import { configureStore, type ThunkAction, type Action } from '@reduxjs/toolkit'

export const store = configureStore({
  reducer: {
    loading: loadingReducer,
    snackbar: snackbarReducer
  },
})

export type AppDispatch = typeof store.dispatch
export type RootState = ReturnType<typeof store.getState>
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>
