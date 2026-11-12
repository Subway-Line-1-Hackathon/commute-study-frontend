import mascot from '../../assets/mascot-cheer.png'

export default function RouteProgress({ progress }) {
  const ratio = progress / 100

  return (
    <div className="relative flex h-8 items-center">
      <span className="absolute inset-x-2 h-1.5 rounded-full bg-line" />
      <span
        className="absolute left-2 h-1.5 rounded-full bg-primary transition-all"
        style={{ width: `calc((100% - 1rem) * ${ratio})` }}
      />
      <span className="absolute left-0 h-4 w-4 rounded-full bg-primary" />
      <span className="absolute right-0 h-4 w-4 rounded-full border-[3px] border-line bg-surface" />
      <img
        src={mascot}
        alt=""
        className="absolute h-8 w-8 -translate-x-1/2 transition-all"
        style={{ left: `calc(0.5rem + (100% - 1rem) * ${ratio})` }}
      />
    </div>
  )
}
