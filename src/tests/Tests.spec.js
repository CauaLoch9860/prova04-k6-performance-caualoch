import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/latest/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Métricas Customizadas (Critério de Metrics)
// Métrica do tipo TREND validando a duração da chamada GET
export const getRequestDuration = new Trend('get_request_duration', true);
// Metrica do tipo RATE validadno o status code
export const rateStatusOk = new Rate('rate_status_ok');

export const options = {
  // Critérios de Rampa (Stages)
  // Tempo total de 3.5 minutos (210 segundos)
  stages: [
    { duration: '30s', target: 7 }, // 1. Rampa de 0 para 7 VUs (Iniciando com 7 VUs)
    { duration: '30s', target: 92 }, // 2. Rampa de 7 para 92 VUs (Máximo de 92 VUs)
    { duration: '1m30s', target: 92 }, // 3. Sustenta 92 VUs por 1.5 minutos (90s)
    { duration: '30s', target: 7 }, // 4. Rampa de 92 de volta para 7 VUs
    { duration: '30s', target: 7 } // 5. Mantém 7 VUs (resfriamento)
    // Total: 30 + 30 + 90 + 30 + 30 = 210s = 3.5 minutos
  ],

  // Critérios de Thresholds
  thresholds: {
    // 90% das respotas com tempo abaixo de 6800ms (atrelado à métrica Trend)
    get_request_duration: ['p(90)<6800'],

    // Menos de 25% das requisições retornando erro
    http_req_failed: ['rate<0.25']
  }
};

// Configuração do Relatório (do seu script original)
export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

// Função principal (Default Function)
export default function () {
  // 1. API Recomendada
  const baseUrl = 'https://jsonplaceholder.typicode.com/';
  const endpoint = 'posts/1';
  const OK = 200;

  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  // Executa o GET na API
  const res = http.get(`${baseUrl}${endpoint}`, params);

  // 2. Adiciona dados às Métricas Customizadas
  // Adiciona o tempo de duração da requisição (Trend)
  getRequestDuration.add(res.timings.duration);
  // Adiciona se o status foi 200 (Rate)
  rateStatusOk.add(res.status === OK);

  // 3. Check (para o http_req_failed funcionar)
  check(res, {
    'GET /posts/1 - Status 200': () => res.status === OK
  });

  // Adiciona uma pausa de 1 segundo entre as iterações de cada VU
  // Isso simula um usuário real e evita sobrecarregar a API de testes
  sleep(1);
}