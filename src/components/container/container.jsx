import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Grid, Typography, Card, CardHeader, CardContent } from '@material-ui/core'
import MoreMenu from 'components/moremenu/moremenu'
import { connect } from 'react-redux'
import {SortableHandle} from 'react-sortable-hoc';

import Item from 'components/item/item'
import EditContainer from 'components/editContainer/editContainer'
import OccupancyDisplay from 'components/container/occupancyDisplay'
import { editContainer } from 'actions/container/container'
import { bulkSetUnassignedItems, bulkSetContainerItems, saveState } from 'actions/real/real'

import { withStyles } from '@material-ui/core/styles'
import { getSnapshotContainer } from 'utils'
import { Droppable } from 'react-beautiful-dnd'

const EDIT = "Edit";
const REMOVE_ALL = "Remove all";
const DELETE_FROM_ALL_SNAPSHOTS = "Delete from all snapshots";

const styles = theme => ({
    card: {
        background:"#fcfcfc"
    },
    cardHeader: {
        paddingLeft: 0,
        paddingTop: 0,
        paddingBottom: 0,
        paddingRight: 10
    },
    cardContent: {
        paddingLeft: 10,
        paddingTop: 0,
        paddingBottom: 0,
        paddingRight: 10
    }
})

// Create a drag handle out of the name of the container
const DragHandle = SortableHandle(({name}) => (
    <div style={{cursor: "grab"}}>
        <Typography variant="body1" align="left">
            <b>{name}</b>
        </Typography>
    </div>));

export class Container extends Component {
    constructor(props) {
        super(props)

        this.state = {
            isEdit: false,
            editName: this.props.container.name,
            editSize: this.props.container.size
        }
    }

    handleEditContainerNameChange = (e) => {
        this.setState({
            ...this.state,
            editName: e.target.value
        })
    }

    handleEditContainerSizeChange = (e) => {
        let val = parseInt(e.target.value)
        if (isNaN(val)) {
            val = 0
        }
        this.setState({
            ...this.state,
            editSize: val
        })
    }

    handleSaveEditContainer = () => {
        this.setState({
            ...this.state,
            isEdit: false
        })
        this.props.editContainer({
            ...this.props.container,
            name: this.state.editName,
            size: this.state.editSize
        })
    }

    handleEditContainerEscKey = () => {
        this.setState({
            isEdit: false,
            editName: this.props.container.name,
            editSize: this.props.container.size
        })
    }

    getItemIds = () => {
        return getSnapshotContainer(this.props.snapshot, this.props.container._id).items
    }

    getItems = (items) => {
        const itemsInContainer = []
        for (let itemId of this.getItemIds()) {
            const item = items.find(ele => ele._id === itemId)
            // Check if item exists
            if (item) {
                itemsInContainer.push(item)
            }
        }
        return itemsInContainer
    }

    addAllItemToUnassigned = () => {
        const updatedItemsList = [...this.props.snapshot.unassigned];

        this.getItemIds().forEach(itemId => {
            if (!this.props.snapshot.unassigned.includes(itemId)) {
                updatedItemsList.push(itemId);
            }
            else {
                console.log("Item was found in unassigned when it shouldn't be!");
            }
        })
        this.props.bulkSetUnassignedItems(this.props.snapshot._id, updatedItemsList);  
    }
    
    removeAllItemFromContainer = () => {
        const snapshotContainer = this.props.snapshot.snapshotContainers.find(container => container._id === this.props.container._id);
        const itemIds = this.getItemIds();
        const updatedItemsList = snapshotContainer.items.filter(item => !itemIds.includes(item));
        this.props.bulkSetContainerItems(this.props.snapshot._id, this.props.container._id, updatedItemsList);
    }

    removeAllItems = () => {
        this.addAllItemToUnassigned();
        this.removeAllItemFromContainer();
        this.props.saveState();
    }

    handleItemClick = option => {
        if (option === DELETE_FROM_ALL_SNAPSHOTS) {
            this.props.deleteContainer(this.props.container._id)
        }
        if (option === REMOVE_ALL) {
            this.removeAllItems();
        }
        else if (option === EDIT) {
            this.setState({
                ...this.state,
                isEdit: true,
                editName: this.props.container.name,
                editSize: this.props.container.size,
            })
        }
    }

    handleContainerDoubleClick = () => {
        this.setState({
            ...this.state,
            isEdit: true,
            editName: this.props.container.name,
            editSize: this.props.container.size,
        })
    }

    render () {
        const { classes } = this.props
        const options = [
            EDIT,
            REMOVE_ALL,
            DELETE_FROM_ALL_SNAPSHOTS
        ]
        const items = this.getItems(this.props.items)

        const containerCard = (
            <Card className={classes.card}>
                <CardHeader
                    className={classes.cardHeader}
                    title={
                        <DragHandle name={this.props.container.name} />
                    }
                    onDoubleClick={this.handleContainerDoubleClick}
                    action={<MoreMenu options = {options} handleItemClick = {this.handleItemClick} />}
                    avatar={<OccupancyDisplay total={this.props.container.size} count={items.length} />}
                />
                <Droppable droppableId={this.props.container._id} ignoreContainerClipping={true} type={"item"}>
                    {(provided, snapshot) => (
                        <div ref={provided.innerRef}>
                            <CardContent className={classes.cardContent}>
                                {
                                    items.map((item, index) => {
                                        if (typeof item !== 'undefined')
                                            return (
                                                <Grid item xs={12} key={item._id}>
                                                    <Item 
                                                        item={item} 
                                                        index={index} 
                                                        getDragItemColor={this.props.getDragItemColor} 
                                                        containerId={this.props.container._id} />
                                                </Grid>
                                            )
                                        return {}
                                    })
                                }
                                {provided.placeholder}
                            </CardContent>
                        </div>
                    )}
                </Droppable>
            </Card>      
        )

        const editContainer = (
            <EditContainer 
                name={this.state.editName}
                size={this.state.editSize}
                handleNameChange={this.handleEditContainerNameChange}
                handleSizeChange={this.handleEditContainerSizeChange}
                handleEnter={this.handleSaveEditContainer}
                handleEsc={this.handleEditContainerEscKey}
            />
        )


        if (this.state.isEdit) {
            return editContainer
        }
        return containerCard
    }
}

Container.propTypes = {
    snapshot: PropTypes.shape({
        _id: PropTypes.string,
        name: PropTypes.string,
        snapshot: PropTypes.object
    }),
    items: PropTypes.arrayOf(PropTypes.shape({
        _id: PropTypes.string,
        name: PropTypes.string,
        size: PropTypes.number
    })),
    container: PropTypes.shape({
        _id: PropTypes.string,
        name: PropTypes.string,
        size: PropTypes.number
    }),
    deleteContainer: PropTypes.func,
    getDragItemColor: PropTypes.func
}

const mapStateToProps = (state, ownProps) => {
    const { real } = state;
    return { real };
}

const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        editContainer: (container) => {
            dispatch(editContainer(container))
        },
        bulkSetUnassignedItems: (snapshotId, unassigned) => {
            dispatch(bulkSetUnassignedItems(snapshotId, unassigned))
        },
        bulkSetContainerItems: (snapshotId, containerId, items) => {
            dispatch(bulkSetContainerItems(snapshotId, containerId, items))
        },
        saveState: () => {
            dispatch(saveState())
        },
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
) (withStyles(styles)(Container))