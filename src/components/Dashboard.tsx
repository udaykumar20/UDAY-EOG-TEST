import React from 'react';
import SubHeader from './SubHeader';
import Chart from './Chart';
import { client } from '../App';
import { useSubscription } from '@apollo/react-hooks';
import { gql } from '@apollo/client';



const thirtyMinAgo = new Date(Date.now() - 30 * 60000).getTime();
const getMetricsQuery = `
  query{
    getMetrics
  }
`;
const getInput = (metrics: string[]) => {
  return metrics.map(metric => {
    return `{ metricName: "${metric}", after: ${thirtyMinAgo} }`;
  });
};
const getData = (inputQuery: string[]) => {
  return `
 query {
   getMultipleMeasurements(input: [${inputQuery}]){
     metric,
     measurements {
       metric,
       at,
       value,
       unit
     }
   }
 }
`;
};

const newMeasurementSubscription = gql`
  subscription {
    newMeasurement {
      metric
      at
      value
      unit
    }
  }
`;

const fetchMetrics = async () => {
  const res = await client.query({
    query: gql`
      ${getMetricsQuery}
    `,
  });
  return res.data.getMetrics;
};

const fetchData = async (metrics: string[]) => {
  const res = await client.query({
    query: gql`
      ${getData(getInput(metrics))}
    `,
  });
  return res.data.getMultipleMeasurements;
};

export interface Measurement {
  metric: string;
  at: number;
  value: number;
  unit: string;
}

interface MeasurementSub {
  newMeasurement: Measurement;
}

interface MetricNode {
  metric: string;
  measurements: Measurement[];
}

const dataFilter = (data: Plotly.Data[], selection: (string | undefined)[]) => {
  let returnObj = data.filter(metricObj => {
    return selection.includes(metricObj.name);
  });

  const dummyData: Plotly.Data = {
    x: [],
    y: [],
    name: '',
    yaxis: 'y',
    type: 'scatter',
    line: { color: '#333' },
  };

  returnObj.push(dummyData);

  return returnObj;
};

const dataTransformer = (data: MetricNode[]) => {
  const returnObj: Plotly.Data[] = [];
  const colorArray: string[] = ['#8f0505', '#000', '#d73a49', '#673AB7', '#3F51B5', '#00505a'];
  data.forEach(metricNode => {
    let metricObj: Plotly.Data = {
      x: [],
      y: [],
      name: '',
      yaxis: '',
      type: 'scatter',
      line: { color: colorArray[data.indexOf(metricNode)] },
    };
    metricNode.measurements.forEach(measurement => {
      (metricObj.x as Plotly.Datum[]).push(new Date(measurement.at));
      (metricObj.y as Plotly.Datum[]).push(measurement.value);
    });
    metricObj.name = metricNode.metric;
    switch (metricNode.measurements[0].unit) {
      case 'F':
        metricObj.yaxis = 'y';
        break;
      case 'PSI':
        metricObj.yaxis = 'y2';
        break;
      case '%':
        metricObj.yaxis = 'y3';
    }
    returnObj.push(metricObj);
  });
  return returnObj;
};

const Dashboard = () => {
  const [metricStrings, setMetricStrings] = React.useState<string[]>([]);
  const [selection, setSelection] = React.useState<(string | undefined)[]>([]);
  const [initialData, setInitialData] = React.useState<Plotly.Data[]>([]);
  const [filteredData, setFilteredData] = React.useState<Plotly.Data[]>([]);
  const { loading, data } = useSubscription<MeasurementSub>(newMeasurementSubscription);
  const [prevSubData, setPrevSubData] = React.useState<Measurement>({ metric: "", at: 0, value: 0, unit: "" });
  const [latestData, setLatestData] = React.useState<Measurement[]>([])


  React.useEffect(() => {
    const initialFetch = async () => {
      const metricsRes = await fetchMetrics();

      const dataRes = await fetchData(metricsRes);

      const transformedData = dataTransformer(dataRes);

      setMetricStrings(metricsRes);

      let initialLatestData: Measurement[] = []
      metricsRes.forEach((metric: string) => {
        initialLatestData.push({ metric: metric, at: 0, value: 0, unit: "" })
      })
      setLatestData(initialLatestData);

      setInitialData(transformedData);
    };
    initialFetch();
  }, []);

  React.useEffect(() => {
    const filteredDataValue = dataFilter(initialData, selection);
    setFilteredData(filteredDataValue);
  }, [initialData, selection]);

  React.useEffect(() => {
    if (!loading && (data?.newMeasurement.at !== prevSubData.at || data.newMeasurement.value !== prevSubData.value || data.newMeasurement.metric !== prevSubData.metric)) {
      let measurementNode = data?.newMeasurement
      let matchingSet = initialData.find((metricNode) => metricNode.name === measurementNode?.metric);
      if (matchingSet && measurementNode) {
        (matchingSet.x as Plotly.Datum[]).push(new Date(measurementNode.at));
        (matchingSet.y as Plotly.Datum[]).push(measurementNode.value);
        const updatedData = initialData.map((metricNode) => {
          if (metricNode.name === measurementNode?.metric) {
            return matchingSet
          } else {
            return metricNode
          }
        });
        setInitialData(updatedData as Plotly.Data[]);
        if (data) {
          let latestDataTemplate = latestData.map((measurement) => {
            return measurement.metric === data.newMeasurement.metric ? data.newMeasurement : measurement
          })
          setLatestData(latestDataTemplate)
          setPrevSubData(data.newMeasurement)
        }
      }
    }
  }, [initialData, loading, data, prevSubData, latestData])

  return (
    <div>
      <SubHeader metrics={metricStrings} selection={selection} setSelection={setSelection} latestData={latestData} />
      <div style={{ padding: 0 }}>
        <Chart data={filteredData} />
      </div>
    </div>
  );
};


export default Dashboard;