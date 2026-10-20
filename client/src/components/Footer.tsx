// Footer from David's mockup
export default function Footer() {
  return (
    <footer className="bg-rl-navy-deep py-6 text-sm text-[#9fb0c6]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 md:flex-row">
        <span>&copy; 2026 Resource Learning. Group 4. All rights reserved.</span>
        <span className="[&_a]:text-[#c9d6e6] [&_a:hover]:text-rl-teal">
          <a href="/#support">Support</a> &middot; <a href="/#roadmap">Roadmap</a>
        </span>
      </div>
    </footer>
  )
}
