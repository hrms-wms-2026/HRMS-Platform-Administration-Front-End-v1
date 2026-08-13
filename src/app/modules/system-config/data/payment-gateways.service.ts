import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import {
  CreatePaymentGatewayPayload,
  GatewayVerificationResult,
  PaymentGatewayConfig,
  PaymentGatewayProviderOption,
  RotatePaymentGatewayCredentialsPayload,
} from './payment-gateway.model';

@Injectable({ providedIn: 'root' })
export class PaymentGatewaysService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<PaymentGatewayConfig[]> {
    return this.http.get<PaymentGatewayConfig[]>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.paymentGateways.list}`,
      { withCredentials: true },
    );
  }

  listProviders(): Observable<PaymentGatewayProviderOption[]> {
    return this.http.get<PaymentGatewayProviderOption[]>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.paymentGateways.providers}`,
      { withCredentials: true },
    );
  }

  verifyCredentials(provider: string, secretKey: string): Observable<GatewayVerificationResult> {
    return this.http.post<GatewayVerificationResult>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.paymentGateways.verify}`,
      {
        provider,
        credentials: { secret_key: secretKey },
      },
      { withCredentials: true },
    );
  }

  create(payload: CreatePaymentGatewayPayload): Observable<PaymentGatewayConfig> {
    return this.http.post<PaymentGatewayConfig>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.paymentGateways.create}`,
      payload,
      { withCredentials: true },
    );
  }

  rotateCredentials(
    id: string,
    payload: RotatePaymentGatewayCredentialsPayload,
  ): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}${API_ENDPOINTS.systemConfig.paymentGateways.rotateCredentials(id)}`,
      payload,
      { withCredentials: true },
    );
  }

  resolveForCountry(country: string, environment: string): Observable<unknown> {
    const params = new HttpParams().set('country', country).set('environment', environment);
    return this.http.get(`${this.baseUrl}${API_ENDPOINTS.systemConfig.paymentGateways.resolve}`, {
      params,
      withCredentials: true,
    });
  }
}
