import { Badge, Text } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface ChartDisclaimerProps {
  className?: string;
}

/**
 * Mandatory framing shown with every Scenario Forecast chart: what it is
 * (a simulation), where the data comes from (curated, not live), and that
 * it is not financial advice — plus the TradingView attribution required
 * for use of the `lightweight-charts` library.
 */
export function ChartDisclaimer({ className }: ChartDisclaimerProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="info">Scenario Simulation</Badge>
        <Badge variant="outline">Curated data — not live</Badge>
        <Badge variant="danger">Not financial advice</Badge>
      </div>
      <Text variant="caption" color="tertiary">
        Candles are a simulated visualization of MoonX&rsquo;s curated research scenarios, not a live or
        historical market feed. Charts powered by{" "}
        <a
          href="https://www.tradingview.com/lightweight-charts/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-dotted underline-offset-2 hover:text-foreground-secondary focus-ring"
        >
          Lightweight Charts™
        </a>{" "}
        by TradingView.
      </Text>
    </div>
  );
}
