"use client";

import YerevanDashboardHeader from "@/components/dashboard/YerevanDashboardHeader";
import { useCityDashboardState } from "@/hooks/useCityDashboardState";
import { useHeaderBackground } from "@/hooks/useHeaderBackground";
import { playfairDisplay } from "@/lib/fonts/playfair";

export default function YerevanDashboardHeaderMount() {
  const state = useCityDashboardState({ enabled: true });
  const programmedCity = state.locationState.programmedCity || state.coords.city || "Yerevan";
  const country = state.locationState.country || state.coords.country || "";
  const backdrop = useHeaderBackground(programmedCity, country);

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
        greetingPlaceName={state.greetingPlaceName}
        helloOverride={state.locationState.helloOverride}
        needsManualCity={state.needsManualCity}
        manualCityOpen={state.manualCityOpen}
        onManualCityOpenChange={state.setManualCityOpen}
        onPinCity={state.pinCityByQuery}
        onPinCuratedCity={state.pinCuratedCity}
        locationServicesEnabled={state.locationServicesEnabled}
        onLocationServicesChange={state.setLocationServices}
        permissionState={state.permissionState}
        onRefreshLocation={state.refreshLocationFromGps}
        backdropCurrentSrc={backdrop.currentSrc}
        backdropIncomingSrc={backdrop.incomingSrc}
        onBackdropIncomingLoaded={backdrop.promoteIncoming}
        backdropPhotographerName={backdrop.photo?.photographerName}
        backdropPhotographerUrl={backdrop.photo?.photographerUrl}
        fontClassName={playfairDisplay.className}
      />
    </div>
  );
}
