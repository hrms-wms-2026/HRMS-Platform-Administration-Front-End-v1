import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import {
  ApplyTenantRoleTemplatePayload,
  ApplyTenantRoleTemplateResult,
  CreateTenantRolePayload,
  InviteTenantAdminPayload,
  TenantInvitationResult,
  TenantPermissionCatalog,
  TenantRoleDetail,
  TenantRoleSummary,
  UpdateTenantPayload,
} from './tenant-admin.model';

interface TenantRoleSummaryApi {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissionCount: number;
  createdAt: string;
  updatedAt: string | null;
  sourceTemplateId: string | null;
}

interface TenantRolePermissionApi {
  id: string;
  code: string;
  description: string;
  module: string;
}

interface TenantRoleDetailApi {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: TenantRolePermissionApi[];
  universalPermissions: TenantRolePermissionApi[];
  createdAt: string;
  updatedAt: string | null;
}

interface TenantPermissionCatalogItemApi {
  id: string | null;
  code: string;
  description: string;
  module: string;
  isAssignable: boolean;
  isUniversal: boolean;
}

interface TenantPermissionCatalogApi {
  assignablePermissions: TenantPermissionCatalogItemApi[];
  universalPermissions: TenantPermissionCatalogItemApi[];
}

interface ApplyTenantRoleTemplateResultApi {
  roleId: string;
  roleName: string;
  appliedPermissions: string[];
  rejectedPermissions: string[];
  universalPermissions: string[];
}

@Injectable({ providedIn: 'root' })
export class TenantAdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  updateTenant(tenantId: string, payload: UpdateTenantPayload): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}${API_ENDPOINTS.tenants.update(tenantId)}`, payload, {
      withCredentials: true,
    });
  }

  inviteAdmin(tenantId: string, payload: InviteTenantAdminPayload): Observable<TenantInvitationResult> {
    return this.http.post<TenantInvitationResult>(
      `${this.baseUrl}${API_ENDPOINTS.tenants.inviteAdmin(tenantId)}`,
      {
        email: payload.email,
        first_name: payload.firstName,
        last_name: payload.lastName,
        role_id: payload.roleId,
      },
      { withCredentials: true },
    );
  }

  listRoles(tenantId: string): Observable<TenantRoleSummary[]> {
    return this.http
      .get<TenantRoleSummaryApi[]>(`${this.baseUrl}${API_ENDPOINTS.tenants.roles.list(tenantId)}`, {
        withCredentials: true,
      })
      .pipe(map((items) => items.map((item) => this.mapRoleSummary(item))));
  }

  createRole(tenantId: string, payload: CreateTenantRolePayload): Observable<TenantRoleDetail> {
    return this.http
      .post<TenantRoleDetailApi>(`${this.baseUrl}${API_ENDPOINTS.tenants.roles.create(tenantId)}`, {
        name: payload.name,
        description: payload.description ?? null,
        permissionIds: payload.permissionIds,
      }, { withCredentials: true })
      .pipe(map((item) => this.mapRoleDetail(item)));
  }

  assignRolePermissions(
    tenantId: string,
    roleId: string,
    permissionIds: string[],
  ): Observable<TenantRoleDetail> {
    return this.http
      .put<TenantRoleDetailApi>(
        `${this.baseUrl}${API_ENDPOINTS.tenants.roles.updatePermissions(tenantId, roleId)}`,
        { permissionIds },
        { withCredentials: true },
      )
      .pipe(map((item) => this.mapRoleDetail(item)));
  }

  getPermissionCatalog(tenantId: string): Observable<TenantPermissionCatalog> {
    return this.http
      .get<TenantPermissionCatalogApi>(
        `${this.baseUrl}${API_ENDPOINTS.tenants.permissions.catalog(tenantId)}`,
        { withCredentials: true },
      )
      .pipe(map((catalog) => ({
        assignablePermissions: catalog.assignablePermissions,
        universalPermissions: catalog.universalPermissions,
      })));
  }

  applyRoleTemplate(
    tenantId: string,
    templateId: string,
    payload: ApplyTenantRoleTemplatePayload = {},
  ): Observable<ApplyTenantRoleTemplateResult> {
    return this.http
      .post<ApplyTenantRoleTemplateResultApi>(
        `${this.baseUrl}${API_ENDPOINTS.tenants.roleTemplates.apply(tenantId, templateId)}`,
        {
          roleNameOverride: payload.roleNameOverride ?? null,
          forceUpdate: payload.forceUpdate ?? false,
        },
        { withCredentials: true },
      )
      .pipe(map((result) => ({
        roleId: result.roleId,
        roleName: result.roleName,
        appliedPermissions: result.appliedPermissions,
        rejectedPermissions: result.rejectedPermissions,
        universalPermissions: result.universalPermissions,
      })));
  }

  private mapRoleSummary(item: TenantRoleSummaryApi): TenantRoleSummary {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      isSystem: item.isSystem,
      permissionCount: item.permissionCount,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      sourceTemplateId: item.sourceTemplateId,
    };
  }

  private mapRoleDetail(item: TenantRoleDetailApi): TenantRoleDetail {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      isSystem: item.isSystem,
      permissions: item.permissions,
      universalPermissions: item.universalPermissions,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
