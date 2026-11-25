"use client";

import YerevanDashboardHeader from "@/components/dashboard/YerevanDashboardHeader";
import { useCityBackdrop } from "@/hooks/useCityBackdrop";
import { useCityDashboardState } from "@/hooks/useCityDashboardState";
import { playfairDisplay } from "@/lib/fonts/playfair";

export default function YerevanDashboardHeaderMount() {
  const state = useCityDashboardState({ enabled: true });
  const city = state.coords.city || "Yerevan";
  const backdrop = useCityBackdrop(city);

  return (
    <div className={playfairDisplay.variable}>
      <YerevanDashboardHeader
        tempUnit={state.tempUnit}
        onTempUnitChange={state.setTempUnit}
        coords={state.coords}
        localClock={state.localClock}
        weather={state.weather}
        quote={state.quote}
        clocks={state.clocks}
        onOpenCities={state.openCitiesPicker}
        onCitiesChange={state.refreshClocks}
        onOpenCityGuide={state.openCityGuide}
        needsManualCity={state.needsManualCity}
        manualCityOpen={state.manualCityOpen}
        onManualCityOpenChange={state.setManualCityOpen}
        onPinCity={state.pinCityByQuery}
        locationServicesEnabled={state.locationServicesEnabled}
        onLocationServicesChange={state.setLocationServices}
        permissionState={state.permissionState}
        onRefreshLocation={state.refreshLocationFromGps}
        backdropSrc={backdrop.src}
        fontClassName={playfairDisplay.className}
      />
    </div>
  );
}
