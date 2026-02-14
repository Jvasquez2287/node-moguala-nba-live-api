interface EmailData {
    [key: string]: any;
}
type SubscriptionStatus = 'success' | 'cancel' | 'error' | 'invalid' | 'renewal';
declare class EmailService {
    private transporter;
    private isConfigured;
    constructor();
    private initializeTransporter;
    /**
     * Read and render HTML template with data
     */
    private renderTemplate;
    /**
     * Send subscription success email
     */
    sendSuccessEmail(data: {
        userEmail: string;
        userName?: string;
        userClerkId: string;
        subscriptionStatus: string;
        subscriptionId: string;
        periodStart: string;
        periodEnd: string;
        subscriptionInvoicePdfUrl?: string;
    }): Promise<boolean>;
    /**
     * Send subscription renewal email
     */
    sendRenewalEmail(data: {
        userEmail: string;
        userName?: string;
        subscriptionStatus: string;
        subscriptionId: string;
        periodStart: string;
        periodEnd: string;
        subscriptionInvoicePdfUrl?: string;
    }): Promise<boolean>;
    /**
     * Send subscription canceled email
     */
    sendCanceledEmail(data: {
        userEmail: string;
        userName?: string;
    }): Promise<boolean>;
    /**
     * Send subscription error email
     */
    sendErrorEmail(data: {
        userEmail: string;
        userName?: string;
        errorMessage?: string;
    }): Promise<boolean>;
    /**
     * Send invalid request email
     */
    sendInvalidEmail(data: {
        userEmail: string;
        userName?: string;
        errorMessage?: string;
    }): Promise<boolean>;
    /**
     * Generic method to send email based on subscription status
     */
    sendSubscriptionEmail(status: SubscriptionStatus, data: EmailData): Promise<boolean>;
    /**
     * Verify email configuration and send test email
     */
    verifyConfiguration(testEmail: string): Promise<boolean>;
    /**
     * Check if email service is properly configured
     */
    isReady(): boolean;
}
export declare const emailService: EmailService;
export {};
//# sourceMappingURL=emailService.d.ts.map