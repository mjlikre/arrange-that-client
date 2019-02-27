import {
    SET_REAL_DATA,
    SET_UNASSIGNED,
    SET_SNAPSHOT,
    SAVE_STATE
} from 'actions/actiontypes'

export const setRealData = (data) => ({
    type: SET_REAL_DATA,
    data
})

export const setUnassigned = (data) => ({
    type: SET_UNASSIGNED,
    data
})

export const setSnapshot = (data) => ({
    type: SET_SNAPSHOT,
    data
})

export const saveState = (data) => ({
    type: SAVE_STATE,
    data
})