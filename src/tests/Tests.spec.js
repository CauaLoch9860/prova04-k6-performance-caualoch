import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/latest/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

export const getRequestDuration = new Trend('get_request_duration', true);
export const rateStatusOk = new Rate('rate_status_ok');

export const options = {
  stages: [
    { duration: '30s', target: 7 }, // 1. Rampa de 0 para 7 VUs (Iniciando com 7 VUs)
    { duration: '30s', target: 92 }, // 2. Rampa de 7 para 92 VUs (Máximo de 92 VUs)
    { duration: '1m30s', target: 92 }, // 3. Sustenta 92 VUs por 1.5 minutos (90s)
    { duration: '30s', target: 7 }, // 4. Rampa de 92 de volta para 7 VUs
    { duration: '30s', target: 7 } // 5. Mantém 7 VUs (resfriamento)
  ],

  
  thresholds: {
    get_request_duration: ['p(90)<6800'],
    http_req_failed: ['rate<0.25']
  }
};


export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}


export default function () {

  const baseUrl = 'https://jsonplaceholder.typicode.com/';
  const endpoint = 'posts/1';
  const OK = 200;

  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const res = http.get(`${baseUrl}${endpoint}`, params);

 
  getRequestDuration.add(res.timings.duration);

  rateStatusOk.add(res.status === OK);


  check(res, {
    'GET /posts/1 - Status 200': () => res.status === OK
  });


  sleep(1);
}