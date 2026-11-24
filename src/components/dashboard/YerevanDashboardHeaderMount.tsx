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
        weather={state.weather}
        quote={state.quote}
        clocks={state.clocks}
        onOpenCities={state.openCitiesPicker}
        onOpenSettings={state.openSettings}
        onOpenCityGuide={state.openCityGuide}
        backdropSrc={backdrop.src}
        fontClassName={playfairDisplay.className}
      />
    </div>
  );
}
