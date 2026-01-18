import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface SnackbarState {
  message: string
  type?: 'success' | 'warning' | 'info' | 'error'
  position?: 'top' | 'bottom'
}

const initialState: SnackbarState = {
  message: '',
  type: 'success',
  position: 'bottom',
}

export const snackbarSlice = createSlice({
  name: 'snackbar',
  initialState,
  reducers: {
    showSnackbar(state, action: PayloadAction<SnackbarState>) {
      const { message, type, position }: SnackbarState = action.payload
      state.message = message
      state.type = type
      state.position = position
    },
    hideSnackbar(state) {
      state.message = ''
    },
  },
  extraReducers: () => {},
})

export const { showSnackbar, hideSnackbar } = snackbarSlice.actions

export default snackbarSlice.reducer
