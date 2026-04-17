-- CreateEnum
CREATE TYPE "OrderOutcome" AS ENUM ('AUTO_ACCEPTED', 'MANUALLY_ACCEPTED', 'TIMED_OUT', 'CANCELLED_BY_PLATFORM');

-- CreateEnum
CREATE TYPE "HolidayCategory" AS ENUM ('FIXED_DATE', 'LUNAR');

-- CreateEnum
CREATE TYPE "HolidayApprovalStatus" AS ENUM ('AUTO_APPROVED', 'OPERATOR_OVERRIDDEN');

-- CreateEnum
CREATE TYPE "HolidayPolicyEffect" AS ENUM ('CLOSED', 'CUSTOM_HOURS', 'OPEN_NORMAL');

-- CreateEnum
CREATE TYPE "WorkingDayEffect" AS ENUM ('CLOSED', 'CUSTOM_HOURS', 'OPEN_NORMAL');

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "preAcceptDelayMs" INTEGER NOT NULL DEFAULT 0,
    "manualAcceptTimeoutMs" INTEGER NOT NULL DEFAULT 120000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyScheduleDay" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "WeeklyScheduleDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryPlatform" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "DeliveryPlatform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantPlatform" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RestaurantPlatform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformCredential" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "ciphertextBlob" BYTEA NOT NULL,
    "derivationSalt" BYTEA NOT NULL,
    "algorithmId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallationKey" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "encryptedKey" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstallationKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "platformOrderId" TEXT NOT NULL,
    "totalValue" DECIMAL(10,2) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "outcomeStatus" "OrderOutcome" NOT NULL,
    "outcomeAt" TIMESTAMP(3) NOT NULL,
    "operatorNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAuditLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "originalValue" TEXT,
    "newValue" TEXT,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operatorId" TEXT NOT NULL,

    CONSTRAINT "OrderAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HolidayType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "HolidayCategory" NOT NULL,

    CONSTRAINT "HolidayType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HolidayCalendarEntry" (
    "id" TEXT NOT NULL,
    "holidayTypeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "approvalStatus" "HolidayApprovalStatus" NOT NULL DEFAULT 'AUTO_APPROVED',

    CONSTRAINT "HolidayCalendarEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantHolidayPolicy" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "holidayTypeId" TEXT NOT NULL,
    "effect" "HolidayPolicyEffect" NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,

    CONSTRAINT "RestaurantHolidayPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkingDayOverride" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "effect" "WorkingDayEffect" NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,

    CONSTRAINT "WorkingDayOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySummary" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "acceptedCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL,
    "totalRevenue" DECIMAL(10,2) NOT NULL,
    "platformBreakdown" JSONB NOT NULL,
    "peakHour" INTEGER,
    "topItems" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailySummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyScheduleDay_restaurantId_dayOfWeek_key" ON "WeeklyScheduleDay"("restaurantId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryPlatform_name_key" ON "DeliveryPlatform"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryPlatform_slug_key" ON "DeliveryPlatform"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantPlatform_restaurantId_platformId_key" ON "RestaurantPlatform"("restaurantId", "platformId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformCredential_restaurantId_platformId_key" ON "PlatformCredential"("restaurantId", "platformId");

-- CreateIndex
CREATE UNIQUE INDEX "InstallationKey_restaurantId_key" ON "InstallationKey"("restaurantId");

-- CreateIndex
CREATE INDEX "Order_restaurantId_receivedAt_idx" ON "Order"("restaurantId", "receivedAt");

-- CreateIndex
CREATE INDEX "Order_restaurantId_outcomeStatus_idx" ON "Order"("restaurantId", "outcomeStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Order_restaurantId_platformOrderId_key" ON "Order"("restaurantId", "platformOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "HolidayType_name_key" ON "HolidayType"("name");

-- CreateIndex
CREATE INDEX "HolidayCalendarEntry_year_idx" ON "HolidayCalendarEntry"("year");

-- CreateIndex
CREATE UNIQUE INDEX "HolidayCalendarEntry_holidayTypeId_year_key" ON "HolidayCalendarEntry"("holidayTypeId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantHolidayPolicy_restaurantId_holidayTypeId_key" ON "RestaurantHolidayPolicy"("restaurantId", "holidayTypeId");

-- CreateIndex
CREATE INDEX "WorkingDayOverride_restaurantId_date_idx" ON "WorkingDayOverride"("restaurantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingDayOverride_restaurantId_date_key" ON "WorkingDayOverride"("restaurantId", "date");

-- CreateIndex
CREATE INDEX "DailySummary_restaurantId_date_idx" ON "DailySummary"("restaurantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailySummary_restaurantId_date_key" ON "DailySummary"("restaurantId", "date");

-- AddForeignKey
ALTER TABLE "WeeklyScheduleDay" ADD CONSTRAINT "WeeklyScheduleDay_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantPlatform" ADD CONSTRAINT "RestaurantPlatform_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantPlatform" ADD CONSTRAINT "RestaurantPlatform_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "DeliveryPlatform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformCredential" ADD CONSTRAINT "PlatformCredential_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformCredential" ADD CONSTRAINT "PlatformCredential_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "DeliveryPlatform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallationKey" ADD CONSTRAINT "InstallationKey_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "DeliveryPlatform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAuditLog" ADD CONSTRAINT "OrderAuditLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HolidayCalendarEntry" ADD CONSTRAINT "HolidayCalendarEntry_holidayTypeId_fkey" FOREIGN KEY ("holidayTypeId") REFERENCES "HolidayType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantHolidayPolicy" ADD CONSTRAINT "RestaurantHolidayPolicy_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantHolidayPolicy" ADD CONSTRAINT "RestaurantHolidayPolicy_holidayTypeId_fkey" FOREIGN KEY ("holidayTypeId") REFERENCES "HolidayType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingDayOverride" ADD CONSTRAINT "WorkingDayOverride_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySummary" ADD CONSTRAINT "DailySummary_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
