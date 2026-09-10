/**
 * POKÉVAULT LEGENDS — Vault Slab & Certificate Verification Controller
 */

import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';
import { getAllProducts } from './data/products.js';

const SAMPLE_CERTS = {
  "47318042": {
    name: "1999 Pokémon Base Set 1st Edition Shadowless Charizard #4 Holo",
    grade: "PSA 10 GEM MINT",
    gradingBody: "Professional Sports Authenticator (PSA)",
    certNumber: "47318042",
    popWorldwide: "121 Worldwide in PSA 10",
    releaseYear: "1999",
    set: "Base Set 1st Edition Shadowless",
    cardNo: "#4/102",
    language: "English",
    subgrades: { Centering: "10", Corners: "10", Edges: "10", Surface: "10" },
    inspectionDate: "2026-06-14",
    authenticityScore: "100.0% Perfect Audit",
    vaultStatus: "SECURED IN VAULT (MUMBAI HUB)",
    image: "/assets/charizard.png"
  },
  "58921473": {
    name: "1999 Masaki Vending Mail Gengar Holo Trophy Promo",
    grade: "PSA 9 MINT",
    gradingBody: "Professional Sports Authenticator (PSA)",
    certNumber: "58921473",
    popWorldwide: "48 Worldwide in PSA 9",
    releaseYear: "1999",
    set: "Japanese Communication Evolution Campaign",
    cardNo: "PROMO",
    language: "Japanese",
    subgrades: { Centering: "9.5", Corners: "9.0", Edges: "9.0", Surface: "9.5" },
    inspectionDate: "2026-07-02",
    authenticityScore: "99.8% Perfect Audit",
    vaultStatus: "SECURED IN VAULT (MUMBAI HUB)",
    image: "/assets/gengar.png"
  },
  "99302148": {
    name: "1998 CoroCoro Comics Pikachu Illustrator Trophy Holo",
    grade: "PSA 9 MINT",
    gradingBody: "Professional Sports Authenticator (PSA)",
    certNumber: "99302148",
    popWorldwide: "39 Copies Certified Total",
    releaseYear: "1998",
    set: "CoroCoro Illustration Contest",
    cardNo: "UNNUMBERED PROMO",
    language: "Japanese",
    subgrades: { Centering: "9.5", Corners: "9.0", Edges: "9.5", Surface: "9.0" },
    inspectionDate: "2026-08-01",
    authenticityScore: "100.0% Verified Holy Grail",
    vaultStatus: "VAULT ARCHIVAL COMPARTMENT A-1",
    image: "/assets/pikachu.png"
  }
};

class VerifyPortal {
  constructor() {
    this.initLayout();
    this.initSearch();

    // Check URL params (?cert=)
    const params = new URLSearchParams(window.location.search);
    const certQuery = params.get('cert') || '47318042';
    this.displayCertificate(certQuery);
  }

  initLayout() {
    document.getElementById('navbarRoot').innerHTML = renderNavbar();
    document.getElementById('cartDrawerRoot').innerHTML = renderCartDrawer();
    document.getElementById('footerRoot').innerHTML = renderFooter();

    initNavbarEvents();
    initCartDrawerEvents();
  }

  initSearch() {
    const form = document.getElementById('certSearchForm');
    const input = document.getElementById('certSearchInput');

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input.value.trim().replace(/#/g, '');
      if (val) this.displayCertificate(val);
    });

    document.querySelectorAll('.sample-cert-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cert = btn.getAttribute('data-cert');
        if (input) input.value = cert;
        this.displayCertificate(cert);
      });
    });
  }

  displayCertificate(certNumber) {
    const container = document.getElementById('certResultContainer');
    if (!container) return;

    const data = SAMPLE_CERTS[certNumber] || {
      name: `Custom Graded Pokémon Collectible (Cert #${certNumber})`,
      grade: "PSA 10 GEM MT",
      gradingBody: "PSA Vault Verified",
      certNumber: certNumber,
      popWorldwide: "Verified in Global Population Registry",
      releaseYear: "2000-2026",
      set: "Official Pokémon TCG",
      cardNo: "#Vault-Item",
      language: "Authentic",
      subgrades: { Centering: "10", Corners: "9.5", Edges: "10", Surface: "10" },
      inspectionDate: new Date().toISOString().split('T')[0],
      authenticityScore: "100.0% Authenticated",
      vaultStatus: "AUTHENTICATED & SERIALIZED",
      image: "/assets/charizard.png"
    };

    container.innerHTML = `
      <div class="holo-cert-card animate-pop-in">
        <div class="cert-header">
          <div>
            <div style="font-family:var(--font-mono); font-weight:800; font-size:0.8rem; color:var(--accent-red); letter-spacing:1.5px; margin-bottom:4px;">
              POKÉVAULT OFFICIAL AUTHENTICITY CERTIFICATE
            </div>
            <h2 style="font-family:var(--font-title); font-weight:900; font-size:1.45rem; color:#000; margin:0;">
              CERTIFICATION #${data.certNumber}
            </h2>
          </div>
          <div class="cert-stamp-badge">
            ✓ 100% VAULT VERIFIED
          </div>
        </div>

        <div class="cert-details-grid">
          <div class="cert-slab-preview">
            <img src="${data.image}" class="cert-slab-img" alt="${data.name}" />
            <div style="font-family:var(--font-mono); font-weight:900; font-size:0.9rem; color:var(--accent-red); margin-top:8px;">
              ${data.grade}
            </div>
          </div>

          <div>
            <h3 style="font-family:var(--font-title); font-weight:900; font-size:1.15rem; color:#0F172A; margin:0 0 1rem; line-height:1.35;">
              ${data.name}
            </h3>

            <table class="cert-specs-table">
              <tbody>
                <tr><td>Grading Authority</td><td>${data.gradingBody}</td></tr>
                <tr><td>Pop Report (Population)</td><td>${data.popWorldwide}</td></tr>
                <tr><td>Card Set / Origin</td><td>${data.set}</td></tr>
                <tr><td>Release Year</td><td>${data.releaseYear}</td></tr>
                <tr><td>Subgrades (C/C/E/S)</td><td>Centering: ${data.subgrades.Centering} | Corners: ${data.subgrades.Corners} | Edges: ${data.subgrades.Edges} | Surface: ${data.subgrades.Surface}</td></tr>
                <tr><td>Audit Date</td><td>${data.inspectionDate}</td></tr>
                <tr><td>Vault Integrity Status</td><td style="color:#16A34A;">● ${data.vaultStatus}</td></tr>
              </tbody>
            </table>

            <div style="display:flex; gap:12px; margin-top:1.5rem; flex-wrap:wrap;">
              <button onclick="window.print()" class="btn-inspect" style="padding:8px 16px; font-size:0.85rem;">🖨️ Print Certificate</button>
              <a href="shop.html" class="btn-pill" style="padding:8px 16px; font-size:0.85rem; text-decoration:none;">🛍️ Browse Graded Slabs →</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

new VerifyPortal();
