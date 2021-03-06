import cloneDeep from 'lodash/cloneDeep';

import {
    ITEM_ADD,
    ITEM_DELETE,
    ITEM_UPDATE,
    CONTAINER_ADD,
    CONTAINER_DELETE,
    CONTAINER_NOTE_DELETE,
    CONTAINER_NOTE_EDIT,
    CONTAINER_EDIT,
    SET_REAL_DATA,
    ARRANGEMENT_RENAME,
    SET_UNASSIGNED_ITEMS,
    SET_CONTAINER_ITEMS,
    SAVE_STATE,
    SNAPSHOT_ADD,
    SNAPSHOT_DELETE,
    SNAPSHOT_RENAME,
    SNAPSHOT_REPOSITION,
    SNAPSHOT_SET_CONTAINERS,
} from 'actions/actionTypes';

import { updateArrangement } from 'services/arrangementService';
import { getSnapshotIndex, getSnapshotContainerIndex } from 'utils';

const initialState = {
    _id: '',
    name: '',
    items: [],
    modified_timestamp: '',
    containers: [],
    is_deleted: false,
    timestamp: '',
    snapshots: [],
};

function exportState(real) {
    const d = new Date();
    const seconds = d.getTime() / 1000;
    const arrangement = {
        ...real,
        modified_timestamp: seconds,
    };
    // Test arrangement based on json validation
    updateArrangement(arrangement)
        .then((response) => {
            Promise.resolve();
        })
        .catch((err) => {
            console.log(err);
            Promise.reject(err);
        });
}

const realReducer = (state = initialState, action) => {
    switch (action.type) {
        case ITEM_ADD: {
        // Add item to global item list
            const addItemState = {
                ...state,
                items: {
                    ...state.items,
                    [action.item._id]: action.item,
                },
            };

            // Add item to all snapshot unassigned
            for (const snapshot of addItemState.snapshots) {
                snapshot.unassigned.push(action.item._id);
            }

            if (!action.bulk) {
                exportState(addItemState);
            }
            return addItemState;
        }

        case ITEM_DELETE: {
            const deleteItemState = cloneDeep(state);

            // Remove item from global items list
            delete deleteItemState.items[action.id];

            // Remove item from all snapshots
            for (const snapshotItemDelete of deleteItemState.snapshots) {
                // Remove item from all containers in snapshot
                for (const containerItemDelete of snapshotItemDelete.snapshotContainers) {
                    containerItemDelete.items = containerItemDelete.items.filter(ele => ele !== action.id);
                }
                // Remove item from unassigned in snapshot
                snapshotItemDelete.unassigned = snapshotItemDelete.unassigned.filter(ele => ele !== action.id);
            }
            if (!action.bulk) {
                exportState(deleteItemState);
            }
            return deleteItemState;
        }

        case ITEM_UPDATE: {
            const resultItemRename = cloneDeep(state);
            const item = resultItemRename.items[action.item._id];
            item.name = action.item.name;
            item.notes = action.item.notes;
            item.color = action.item.color;
            item.gender = action.item.gender;
            item.class = action.item.class;
            if (!action.bulk) {
                exportState(resultItemRename);
            }
            return resultItemRename;
        }

        case CONTAINER_ADD: {
        // Add container to global
            const addContainerState = {
                ...state,
                containers: {
                    ...state.containers,
                    [action.container._id]: action.container,
                },
            };
            // Add container to all snapshots
            for (const snapshot of addContainerState.snapshots) {
                snapshot.snapshotContainers.push({ _id: action.container._id, items: [] });
            }

            exportState(addContainerState);
            return addContainerState;
        }

        case CONTAINER_DELETE: {
            const deleteContainerState = cloneDeep(state);
            // Remove container from global
            delete deleteContainerState.containers[action.id];

            // Delete container to all snapshots
            for (const snapshot of deleteContainerState.snapshots) {
                const containerIndex = getSnapshotContainerIndex(snapshot, action.id);
                for (const item of snapshot.snapshotContainers[containerIndex].items) {
                    snapshot.unassigned.push(item);
                }
                snapshot.snapshotContainers.splice(containerIndex, 1);
            }
            exportState(deleteContainerState);
            return deleteContainerState;
        }

        case CONTAINER_NOTE_DELETE: {
            const snapshotDeleteNoteState = cloneDeep(state);

            const index = getSnapshotIndex(snapshotDeleteNoteState, action.snapshotId);
            const containerNotesList = snapshotDeleteNoteState.snapshots[index].containerNotes;
            const noteIndex = containerNotesList.findIndex(x => (x && x._id === action.noteId));
            containerNotesList.splice(noteIndex, 1);
            exportState(snapshotDeleteNoteState);
            return snapshotDeleteNoteState;
        }

        case CONTAINER_NOTE_EDIT: {
            const snapshotAddNoteState = cloneDeep(state);

            const newNote = action.note;

            const index = getSnapshotIndex(snapshotAddNoteState, action.snapshotId);
            const notesList = snapshotAddNoteState.snapshots[index].containerNotes;

            if (notesList !== undefined) {
                const oldNote = notesList.find(x => (x && x.containerId === newNote.containerId));
                if (oldNote !== undefined) {
                    oldNote.text = action.note.text;
                } else {
                    notesList.push(action.note);
                }
            } else {
                snapshotAddNoteState.snapshots[index].containerNotes = [action.note];
            }

            exportState(snapshotAddNoteState);
            return snapshotAddNoteState;
        }

        case CONTAINER_EDIT: {
            const resultContainerRename = cloneDeep(state);
            const container = resultContainerRename.containers[action.container._id];
            container.name = action.container.name;
            container.size = action.container.size;

            exportState(resultContainerRename);
            return resultContainerRename;
        }

        case SET_REAL_DATA: {
            return cloneDeep(action.data);
        }


        case SET_UNASSIGNED_ITEMS: {
            const setUnassignedState = cloneDeep(state);

            const index = getSnapshotIndex(setUnassignedState, action.snapshotId);
            setUnassignedState.snapshots[index].unassigned = action.unassigned;

            if (!action.bulk) {
                exportState(setUnassignedState);
            }
            return setUnassignedState;
        }

        case SET_CONTAINER_ITEMS: {
            const setContainerItemsState = cloneDeep(state);

            const index = getSnapshotIndex(setContainerItemsState, action.snapshotId);
            const containerIndex = getSnapshotContainerIndex(setContainerItemsState.snapshots[index], action.containerId);
            setContainerItemsState.snapshots[index].snapshotContainers[containerIndex].items = action.items;

            if (!action.bulk) {
                exportState(setContainerItemsState);
            }
            return setContainerItemsState;
        }

        case SAVE_STATE: {
            exportState(state);
            return state;
        }

        case SNAPSHOT_ADD: {
            const snapshotAddState = cloneDeep(state);

            snapshotAddState.snapshots.push(action.snapshot);
            exportState(snapshotAddState);
            return snapshotAddState;
        }

        case SNAPSHOT_DELETE: {
            const snapshotDeleteState = cloneDeep(state);

            const index = getSnapshotIndex(snapshotDeleteState, action.snapshotId);
            snapshotDeleteState.snapshots.splice(index, 1);
            exportState(snapshotDeleteState);
            return snapshotDeleteState;
        }

        case ARRANGEMENT_RENAME: {
            const arrangementRenameState = cloneDeep(state);
            arrangementRenameState.name = action.name;

            exportState(arrangementRenameState);
            return arrangementRenameState;
        }

        case SNAPSHOT_RENAME: {
            const snapshotRenameState = cloneDeep(state);

            const index = getSnapshotIndex(snapshotRenameState, action.snapshotId);
            snapshotRenameState.snapshots[index].name = action.name;
            exportState(snapshotRenameState);
            return snapshotRenameState;
        }

        // ability to drag tabs
        case SNAPSHOT_REPOSITION: {
            const snapshotReposition = cloneDeep(state);

            const c = snapshotReposition.snapshots[action.a];
            snapshotReposition.snapshots[action.a] = snapshotReposition.snapshots[action.b];
            snapshotReposition.snapshots[action.b] = c;

            exportState(snapshotReposition);
            return snapshotReposition;
        }

        case SNAPSHOT_SET_CONTAINERS: {
            const setSnapshotContainersState = cloneDeep(state);
            const index = getSnapshotIndex(setSnapshotContainersState, action.snapshotId);
            setSnapshotContainersState.snapshots[index].snapshotContainers = action.snapshotContainers;

            exportState(setSnapshotContainersState);
            return setSnapshotContainersState;
        }

        default: {
            return state;
        }
    }
};

export default realReducer;
