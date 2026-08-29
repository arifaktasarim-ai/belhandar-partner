import { prisma } from '../../lib/prisma';
import { tlToCents, centsToTl } from '../../utils/money';

function serialize(settings: any) {
  return {
    ...settings,
    defaultCommissionDisplayValue: settings.defaultCommissionType === 'PERCENTAGE'
      ? settings.defaultCommissionValue / 100
      : centsToTl(settings.defaultCommissionValue),
  };
}

export async function getSettings() {
  const settings = await prisma.settings.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global' },
  });
  return serialize(settings);
}

export async function updateSettings(input: {
  brandName?: string; currency?: string;
  defaultCommissionType?: 'PERCENTAGE' | 'FIXED'; defaultCommissionValue?: number;
  defaultMinStockLevel?: number;
}, actorUserId: string) {
  const current = await prisma.settings.upsert({ where: { id: 'global' }, update: {}, create: { id: 'global' } });

  const type = input.defaultCommissionType ?? current.defaultCommissionType;
  const storedValue = input.defaultCommissionValue !== undefined
    ? (type === 'PERCENTAGE' ? Math.round(input.defaultCommissionValue * 100) : tlToCents(input.defaultCommissionValue))
    : undefined;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.settings.update({
      where: { id: 'global' },
      data: {
        brandName: input.brandName,
        currency: input.currency,
        defaultCommissionType: input.defaultCommissionType,
        defaultCommissionValue: storedValue,
        defaultMinStockLevel: input.defaultMinStockLevel,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'SETTINGS_UPDATED',
        entityType: 'Settings',
        entityId: 'global',
        beforeData: { brandName: current.brandName, defaultCommissionValue: current.defaultCommissionValue },
        afterData: { brandName: result.brandName, defaultCommissionValue: result.defaultCommissionValue },
      },
    });

    return result;
  });

  return serialize(updated);
}
