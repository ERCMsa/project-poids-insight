import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { formatPoids } from "@/lib/poids-utils";

type Series = { key: string; label: string; color: string };
type Props = {
  data: Array<Record<string, string | number>>;
  series: Series[];
  height?: number;
  stacked?: boolean;
  xKey?: string;
};

export const PoidsBarChart = ({ data, series, height = 300, stacked, xKey = "date" }: Props) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey={xKey} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatPoids(Number(v))}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.75rem",
            fontSize: "12px",
            boxShadow: "var(--shadow-lg)",
          }}
          formatter={(v: number) => formatPoids(v) + " kg"}
          cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: "12px" }} />}
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color}
            stackId={stacked ? "stack" : undefined}
            radius={stacked ? [0, 0, 0, 0] : [6, 6, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};
