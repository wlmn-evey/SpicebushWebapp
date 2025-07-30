import { SessionManager } from './session-manager';

export class AuditLogger {
  private session: { id: string; userEmail: string };
  private ipAddress?: string;
  
  constructor(session: { id: string; userEmail: string }, ipAddress?: string) {
    this.session = session;
    this.ipAddress = ipAddress;
  }
  
  async logContentChange(
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    resourceType: string,
    resourceId: string,
    details?: Record<string, any>
  ) {
    await SessionManager.logAction({
      sessionId: this.session.id,
      userEmail: this.session.userEmail,
      action: `CONTENT_${action}`,
      resourceType,
      resourceId,
      details,
      ipAddress: this.ipAddress
    });
  }
  
  async logSettingChange(key: string, oldValue: any, newValue: any) {
    await SessionManager.logAction({
      sessionId: this.session.id,
      userEmail: this.session.userEmail,
      action: 'SETTING_UPDATE',
      resourceType: 'setting',
      resourceId: key,
      details: { oldValue, newValue },
      ipAddress: this.ipAddress
    });
  }
  
  async logMediaUpload(filename: string, size: number, url?: string) {
    await SessionManager.logAction({
      sessionId: this.session.id,
      userEmail: this.session.userEmail,
      action: 'MEDIA_UPLOAD',
      resourceType: 'media',
      resourceId: filename,
      details: { size, url },
      ipAddress: this.ipAddress
    });
  }
  
  async logAuthAction(action: 'LOGIN' | 'LOGOUT' | 'PASSWORD_RESET') {
    await SessionManager.logAction({
      sessionId: this.session.id,
      userEmail: this.session.userEmail,
      action: `AUTH_${action}`,
      ipAddress: this.ipAddress
    });
  }
  
  async logAdminAction(action: string, details?: Record<string, any>) {
    await SessionManager.logAction({
      sessionId: this.session.id,
      userEmail: this.session.userEmail,
      action,
      details,
      ipAddress: this.ipAddress
    });
  }
}