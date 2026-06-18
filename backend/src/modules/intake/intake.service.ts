import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from '../../schemas/client.schema';
import {
  IntakeSubmission,
  IntakeSubmissionDocument,
} from '../../schemas/intake-submission.schema';
import { CreateIntakeDto } from './dto/create-intake.dto';
import { TenantService } from '../tenant/tenant.service';
import { EmailService } from '../email/email.service';
import { config } from '../../config/config';

@Injectable()
export class IntakeService {
  constructor(
    @InjectModel(Client.name) private readonly clientModel: Model<ClientDocument>,
    @InjectModel(IntakeSubmission.name)
    private readonly intakeSubmissionModel: Model<IntakeSubmissionDocument>,
    private readonly tenantService: TenantService,
    private readonly emailService: EmailService,
  ) {}

  async submitIntake(payload: CreateIntakeDto) {
    try {
      const normalized = this.normalizePayload(payload);
      const allowedDomains = this.extractAllowedDomains(normalized.companyWebsite);
      const serviceSummary = normalized.servicesOffered.join(', ');

      // Match by business name — each unique business gets its own client row.
      // (Same owner email can own multiple businesses; re-submitting the same name updates that client.)
      let client = await this.clientModel
        .findOne({
          name: normalized.businessName,
          isPlatformTenant: { $ne: true },
        })
        .exec();

      let isNewClient = false;

      if (!client) {
        const createdClient = await this.tenantService.createClient({
          name: normalized.businessName,
          ownerEmail: normalized.ownerEmail,
          ownerName: normalized.ownerName,
          ownerPhone: normalized.ownerPhone,
          companyWebsite: normalized.companyWebsite,
          industry: normalized.industry,
          allowedDomains,
          schedulingLink: normalized.bookingLink,
        });
        client = await this.clientModel.findById(createdClient._id).exec();
        if (!client) {
          throw new BadRequestException('Unable to load client after create.');
        }
        isNewClient = true;
      } else {
        await this.tenantService.updateClient(client._id, {
          name: normalized.businessName,
          ownerName: normalized.ownerName,
          ownerPhone: normalized.ownerPhone,
          companyWebsite: normalized.companyWebsite,
          industry: normalized.industry,
          allowedDomains: allowedDomains.length ? allowedDomains : client.allowedDomains,
          schedulingLink: normalized.bookingLink || client.schedulingLink,
          businessHours: normalized.businessHours,
          timezone: normalized.timezone,
          businessConfig: {
            ...client.businessConfig,
            qualificationGoal:
              client.businessConfig?.qualificationGoal ||
              `Qualify inbound leads for ${serviceSummary}.`,
          },
        } as Partial<Client>);

        client = await this.clientModel.findById(client._id).exec();
        if (!client) {
          throw new BadRequestException('Unable to load client after update.');
        }
      }

      const submission = await this.intakeSubmissionModel.create({
        clientId: client._id,
        ownerEmail: normalized.ownerEmail,
        businessName: normalized.businessName,
        ownerName: normalized.ownerName,
        ownerPhone: normalized.ownerPhone,
        companyWebsite: normalized.companyWebsite,
        industry: normalized.industry,
        servicesOffered: normalized.servicesOffered,
        businessHours: normalized.businessHours,
        timezone: normalized.timezone,
        bookingLink: normalized.bookingLink,
        notes: normalized.notes,
        isNewClient,
        rawPayload: payload,
      });

      if (!client.businessHours || !client.timezone) {
        await this.tenantService.updateClient(client._id, {
          businessHours: normalized.businessHours,
          timezone: normalized.timezone,
        } as Partial<Client>);
      }

      let widgetKey = client.widgetKey;
      if (!widgetKey) {
        const rotated = await this.tenantService.rotateWidgetKey(client._id);
        widgetKey = rotated.widgetKey;
      }

      // Send confirmation emails before responding (required on serverless — fire-and-forget gets killed)
      let emailSent = false;
      try {
        emailSent = await this.sendIntakeEmails(normalized, isNewClient);
      } catch (err) {
        console.error('[IntakeService] Failed to send intake emails:', err);
      }

      return {
        intakeId: submission._id.toString(),
        clientId: client._id.toString(),
        clientSlug: client.slug,
        widgetKey,
        widgetLink: this.buildWidgetLink(widgetKey),
        widgetEmbedScript: this.buildWidgetEmbedScript(widgetKey),
        isNewClient,
        emailSent,
      };
    } catch (error: any) {
      this.handleIntakeError(error);
    }
  }

  private normalizePayload(payload: CreateIntakeDto): CreateIntakeDto {
    return {
      ...payload,
      businessName: payload.businessName.trim(),
      ownerName: payload.ownerName.trim(),
      ownerEmail: payload.ownerEmail.trim().toLowerCase(),
      ownerPhone: payload.ownerPhone?.trim(),
      companyWebsite: payload.companyWebsite?.trim(),
      industry: payload.industry?.trim(),
      servicesOffered: payload.servicesOffered
        .map((service) => service.trim())
        .filter(Boolean),
      businessHours: payload.businessHours.trim(),
      timezone: payload.timezone.trim(),
      bookingLink: payload.bookingLink?.trim(),
      notes: payload.notes?.trim(),
    };
  }

  private extractAllowedDomains(companyWebsite?: string): string[] {
    if (!companyWebsite) {
      return [];
    }

    try {
      const withProtocol = /^https?:\/\//.test(companyWebsite)
        ? companyWebsite
        : `https://${companyWebsite}`;
      const host = new URL(withProtocol).hostname.toLowerCase().replace(/^www\./, '');
      return host ? [host] : [];
    } catch {
      return [];
    }
  }

  private buildWidgetLink(widgetKey: string): string {
    const frontendBase =
      process.env.FRONTEND_URL?.replace(/\/$/, '') || 'http://localhost:3000';
    return `${frontendBase}/widget?widgetKey=${encodeURIComponent(widgetKey)}`;
  }

  private buildWidgetEmbedScript(widgetKey: string): string {
    const frontendBase =
      process.env.FRONTEND_URL?.replace(/\/$/, '') || 'http://localhost:3000';
    return `<script src="${frontendBase}/abby-widget.js" data-widget-key="${widgetKey}"><\/script>`;
  }

  private async sendIntakeEmails(payload: CreateIntakeDto, isNewClient: boolean): Promise<boolean> {
    console.log(`[IntakeService] 📧 Sending intake emails to ${payload.ownerEmail} and ${config.adminEmail}`);

    const ownerResult = await this.emailService.sendIntakeConfirmation(
      payload.ownerEmail,
      payload.ownerName,
      payload.businessName,
      isNewClient,
    );

    const adminResult = await this.emailService.sendIntakeAdminNotification(
      config.adminEmail,
      payload,
      isNewClient,
    );

    if (!ownerResult.success) {
      console.error(`[IntakeService] ❌ Owner confirmation failed for ${payload.ownerEmail}:`, ownerResult.error);
    } else {
      console.log(`[IntakeService] ✅ Owner confirmation sent to ${payload.ownerEmail}`);
    }

    if (!adminResult.success) {
      console.error(`[IntakeService] ❌ Admin notification failed:`, adminResult.error);
    } else {
      console.log(`[IntakeService] ✅ Admin notification sent to ${config.adminEmail}`);
    }

    return ownerResult.success === true;
  }

  private handleIntakeError(error: any): never {
    if (error instanceof ConflictException || error instanceof BadRequestException) {
      throw error;
    }

    if (error?.code === 11000) {
      if (error?.keyPattern?.name) {
        throw new ConflictException(
          'Business name already exists. Use a different business name.',
        );
      }
      if (error?.keyPattern?.ownerEmail || error?.keyPattern?.email) {
        throw new ConflictException(
          'Owner email already belongs to another client account.',
        );
      }
      throw new ConflictException('Duplicate value detected. Please use unique business details.');
    }

    throw new InternalServerErrorException('Failed to process intake form. Please try again.');
  }
}
