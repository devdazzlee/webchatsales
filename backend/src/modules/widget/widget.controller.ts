import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { SkipTenant } from '../tenant/tenant.decorator';
import { TenantService } from '../tenant/tenant.service';

@Controller('api/widget')
export class WidgetController {
  constructor(private readonly tenantService: TenantService) {}

  /**
   * Public beacon — called when abby-widget.js loads on a client site.
   * Records install verification ping.
   */
  @Post('ping')
  @SkipTenant()
  async ping(
    @Body()
    body: {
      widgetKey: string;
      domain?: string;
      pageUrl?: string;
    },
  ) {
    if (!body.widgetKey) {
      return { success: false, message: 'widgetKey is required' };
    }

    const domain =
      body.domain?.trim() ||
      (body.pageUrl ? this.tenantService.extractRequestDomain(body.pageUrl) : null) ||
      '';

    const result = await this.tenantService.recordWidgetPing(
      body.widgetKey,
      domain,
      body.pageUrl,
    );

    return result;
  }

  /**
   * Public widget config for embed script theming
   */
  @Get('config')
  @SkipTenant()
  async getConfig(@Query('widgetKey') widgetKey: string) {
    if (!widgetKey) {
      return { success: false, message: 'widgetKey is required' };
    }

    const config = await this.tenantService.getWidgetConfig(widgetKey);
    if (!config) {
      return { success: false, message: 'Widget not found or not active' };
    }

    return { success: true, config };
  }
}
