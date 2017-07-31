import { type } from './utils';
import fetch from 'fetch';
import moment from 'moment';
import _ from 'lodash';
import {
  COMPARE_MODE_MAPPING,
  eventColorMapping,
  eventWeightMapping
} from './constants';

/**
 * Define the metric action types
 */
export const ActionTypes = {
  LOADING: type('[Events] Loading'),
  LOADED: type('[Events] Data loaded'),
  LOAD_EVENTS: type('[Events] Load events'),
  SET_DATE: type('[Events] Set new region dates'),
  REQUEST_FAIL: type('[Events] Request Fail'),
  RESET: type('[Event] Reset Data')
};

function resetData() {
  return {
    type: ActionTypes.RESET
  };
}

function loading() {
  return {
    type: ActionTypes.LOADING
  };
}

function loadEvents(response) {
  return {
    type: ActionTypes.LOAD_EVENTS,
    payload: response
  };
}

function loaded() {
  return {
    type: ActionTypes.LOADED
  };
}

function setDate(dates) {
  return {
    type: ActionTypes.SET_DATE,
    payload: dates
  };
}

/**
 * Helper function assigning colors to events based on the type
 * @param {Object} event The event object
 */
const assignEventColor = (event) => {
  const { eventType } = event;
  const color = eventColorMapping[eventType] || 'blue';

  return Object.assign(event, { color });
};

/**
 * Helper function assigning weight to events based on the type
 * @param {Object} event The event object
 */
const setWeight = (event) => {
  const { eventType } = event;
  const weight = eventWeightMapping[eventType] || 0;

  return Object.assign(event, {score: weight});
};


/**
 * Fetches all events based for a metric
 * @param {Number} start The start time in unix ms
 * @param {Number} end The end time in unix ms
 * @param {string} mode  The compare mode
 */
function fetchEvents(start, end, mode) {
  return (dispatch, getState) => {
    const { primaryMetric } = getState();

    const {
      primaryMetricId: metricId,
      currentStart = moment(end).subtract(1, 'week').valueOf(),
      currentEnd =  moment().subtract(1, 'day').endOf('day').valueOf(),
      compareMode
    } = primaryMetric;

    if (!metricId) {return;}

    const diff = Math.floor((currentEnd - currentStart) / 4);
    const anomalyEnd = end || (+currentEnd - diff);
    const anomalyStart = start || (+currentStart + diff);
    mode = mode || compareMode;

    const offset = COMPARE_MODE_MAPPING[compareMode] || 1;
    const baselineStart = moment(anomalyStart).clone().subtract(offset, 'week').valueOf();
    const baselineEnd = moment(anomalyEnd).clone().subtract(offset, 'week').valueOf();

    dispatch(setDate([anomalyStart, anomalyEnd]));
    dispatch(loading());
    return fetch(`/rootcause/query?framework=relatedEvents&anomalyStart=${anomalyStart}&anomalyEnd=${anomalyEnd}&baselineStart=${baselineStart}&baselineEnd=${baselineEnd}&analysisStart=${currentStart}&analysisEnd=${currentEnd}&urns=thirdeye:metric:${metricId}`)
      .then(res => res.json())
      .then((res) => {
        // hidding informed events

        return _.uniqBy(res, 'urn')
          .filter(event => event.eventType !== 'informed')
          .map(assignEventColor)
          .sort((a, b) => (b.score - a.score))
          .map(setWeight);
      })
      .then(res => dispatch(loadEvents(res)
    ));
  };
}

/**
 * Updates the date range for the events and refetches the data
 * @param {Number} start The start time in unix ms
 * @param {Number} end The end time in unix ms
 * @param {string} mode  The compare mode
 */
function updateDates(start, end, compareMode) {
  return (dispatch, getState) => {
    const { primaryMetric } = getState();
    compareMode = compareMode || primaryMetric.compareMode;

    return dispatch(fetchEvents(start, end, compareMode));
  };
}

// Resets the store to its initial state
function reset() {
  return (dispatch) => {
    dispatch(resetData());
    return Promise.resolve();
  };
}

export const Actions = {
  loading,
  loaded,
  loadEvents,
  fetchEvents,
  updateDates,
  reset
};