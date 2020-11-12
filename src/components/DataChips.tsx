import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Chip from '@material-ui/core/Chip';
import { Measurement } from './Dashboard';

const useStyles = makeStyles({
  chipContainer: {
    padding:'10px'
  },
  chip: {
    minWidth: 250,
    minHeight: 50,
    margin: 3,
    padding:'10px',
    fontSize: 25,
    fontWeight: 600,
    backgroundColor: 'white',
    borderRadius: 6,
  },
});

const DataChips = (props: { measurement: Measurement }) => {
  const classes = useStyles();
  const { measurement } = props;
  const label =  <div className={classes.chipContainer}> {measurement.metric} <br /> {measurement.value} {measurement.unit}</div>;
  return <Chip className={classes.chip} label={label} />;
}

export default DataChips;