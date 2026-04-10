-- CreateTable
CREATE TABLE "ItineraryTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "planNum" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "nights" INTEGER NOT NULL,
    "destination" TEXT NOT NULL,
    "brief" TEXT,
    "itinerary" JSONB NOT NULL,
    "pricingUsd" JSONB NOT NULL,
    "dmc" TEXT NOT NULL DEFAULT 'Threeland Travel',
    "validity" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItineraryTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryTemplate_code_key" ON "ItineraryTemplate"("code");
