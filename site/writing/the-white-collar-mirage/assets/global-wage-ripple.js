/* An accounting scenario, not a prediction. Destination shares: RBI FY2025–26 Table 5. */
(() => {
  const $ = (id) => document.getElementById(id);
  const assetBase = document.currentScript.src;
  const assetUrl = (filename) => new URL(filename, assetBase);
  const inputs = { workers: $('workers'), base: $('base'), target: $('target'), pass: $('pass'), rent: $('rent') };
  const regions = [
    { id: 'us', label: 'United States', mapLabel: 'UNITED STATES', share: 54.1, coordinates: [-104, 38], anchor: 'end', dx: -15, dy: -16 },
    { id: 'ca', label: 'Canada', mapLabel: 'CANADA', share: 1.3, coordinates: [-112, 57], anchor: 'start', dx: 13, dy: -15 },
    { id: 'uk', label: 'United Kingdom', mapLabel: 'UNITED KINGDOM', share: 15.4, coordinates: [-4, 54], anchor: 'end', dx: -14, dy: -18 },
    { id: 'eu', label: 'Europe excluding UK', mapLabel: 'EUROPE EX UK', share: 16.4, coordinates: [18, 48], anchor: 'start', dx: 14, dy: -25 },
    { id: 'asia', label: 'Asia', mapLabel: 'ASIA', share: 6.3, coordinates: [115, 30], anchor: 'start', dx: 14, dy: -14 },
    { id: 'oceania', label: 'Australia & New Zealand', mapLabel: 'AUSTRALIA + NZ', share: 2.5, coordinates: [144, -29], anchor: 'end', dx: -14, dy: -14 },
    { id: 'other', label: 'Other destinations', mapLabel: 'OTHER', share: 4.0 }
  ];
  const inr = (value, digits = 0) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits })} cr`;
  const money = (value) => value >= 1e9 ? `$${(value / 1e9).toFixed(2)}bn` : `$${(value / 1e6).toFixed(1)}m`;
  const lakh = (value) => `₹${Number.isInteger(value) ? value : value.toFixed(1)}L`;
  const int = (value) => value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  let mapReady = false;

  function scenario() {
    const workers = Number(inputs.workers.value);
    const base = Number(inputs.base.value);
    const target = Number(inputs.target.value);
    const pass = Number(inputs.pass.value) / 100;
    const rent = Number(inputs.rent.value) / 100;
    const raiseRupees = (target - base) * 100000;
    const totalRupees = workers * raiseRupees;
    const clientUsd = totalRupees * pass / 85;
    const rateIncrease = raiseRupees * pass / (85 * 1700);
    return { workers, base, target, pass, rent, raiseRupees, totalRupees, clientUsd, rateIncrease,
      payrollCrore: totalRupees / 1e7, firmCrore: totalRupees * (1 - pass) / 1e7, rentCrore: totalRupees * rent / 1e7 };
  }

  function update() {
    const s = scenario();
    $('workers-out').textContent = int(s.workers);
    $('base-out').textContent = lakh(s.base);
    $('target-out').textContent = lakh(s.target);
    $('pass-out').textContent = `${Math.round(s.pass * 100)}%`;
    $('rent-out').textContent = `${Math.round(s.rent * 100)}%`;
    $('payroll-total').textContent = inr(s.payrollCrore);
    $('monthly-raise').textContent = `₹${int(Math.round(s.raiseRupees / 12))} more per worker each month, before deductions`;
    $('client-total').textContent = money(s.clientUsd);
    $('employer-total').textContent = `Firm side absorbs ${inr(s.firmCrore)} of the direct raise`;
    $('rate-total').textContent = `$${(40 + s.rateIncrease).toFixed(2)}/hr`;
    $('rate-percent').textContent = `+$${s.rateIncrease.toFixed(2)}/hr · +${(s.rateIncrease / 40 * 100).toFixed(2)}% from $40`;
    $('worker-gain-inline').textContent = lakh(s.target - s.base);
    $('rate-change-inline').textContent = `$${s.rateIncrease.toFixed(2)}`;
    $('firm-hit-inline').textContent = inr(s.firmCrore);
    $('rent-share-inline').textContent = `${Math.round(s.rent * 100)}%`;
    $('rent-hit-inline').textContent = inr(s.rentCrore);
    $('region-list').innerHTML = regions.map(r => `<div class="region-row"><span>${r.label}</span><strong>${money(s.clientUsd * r.share / 100)}</strong><small>${r.share.toFixed(1)}% of modeled client bill</small></div>`).join('');
    if (mapReady) {
      d3.selectAll('.region-point').each(function (r) {
        d3.select(this).select('.region-amount').text(money(s.clientUsd * r.share / 100));
        d3.select(this).select('title').text(`${r.label}: ${money(s.clientUsd * r.share / 100)} extra annual client bill under this scenario`);
      });
      d3.select('.india-amount').text(inr(s.payrollCrore));
      d3.selectAll('.flow').classed('active', s.clientUsd > 0);
    }
  }

  async function renderMap() {
    try {
      const [worldResponse, indiaResponse] = await Promise.all([
        fetch(assetUrl('ne_110m_admin_0_countries.geojson')),
        fetch(assetUrl('soi-india-outline.geojson'))
      ]);
      if (!worldResponse.ok || !indiaResponse.ok) throw new Error(`Map data HTTP ${worldResponse.status}/${indiaResponse.status}`);
      const [world, indiaOutline] = await Promise.all([worldResponse.json(), indiaResponse.json()]);
      const svg = d3.select('#world-map');
      const projection = d3.geoNaturalEarth1().fitExtent([[25, 20], [1075, 555]], world);
      const path = d3.geoPath(projection);
      svg.append('path').datum(d3.geoGraticule10()).attr('class', 'graticule').attr('d', path);
      svg.append('g').selectAll('path').data(world.features.filter(d => d.properties.ADMIN !== 'India')).join('path')
        .attr('class', 'country').attr('d', path);
      svg.append('g').selectAll('path').data(indiaOutline.features).join('path')
        .attr('class', 'country india').attr('d', path);
      const india = projection([77.6, 20.6]);
      for (const r of regions.filter(x => x.coordinates)) {
        const p = projection(r.coordinates);
        const middle = [(p[0] + india[0]) / 2, (p[1] + india[1]) / 2 - Math.max(15, Math.abs(india[0] - p[0]) * .045)];
        svg.append('path').attr('class', 'flow').attr('d', `M${p[0]},${p[1]} Q${middle[0]},${middle[1]} ${india[0]},${india[1]}`);
      }
      const points = svg.append('g').selectAll('g').data(regions.filter(x => x.coordinates)).join('g')
        .attr('class', 'region-point').attr('transform', d => {
          const p = projection(d.coordinates); return `translate(${p[0]},${p[1]})`;
        }).attr('tabindex', 0).attr('role', 'img');
      points.append('title');
      points.append('circle').attr('class', 'region-halo').attr('r', 9);
      points.append('circle').attr('class', 'region-dot').attr('r', 4);
      points.append('text').attr('class', 'region-label').attr('x', d => d.dx).attr('y', d => d.dy)
        .attr('text-anchor', d => d.anchor).text(d => d.mapLabel);
      points.append('text').attr('class', 'region-amount').attr('x', d => d.dx).attr('y', d => d.dy + 20)
        .attr('text-anchor', d => d.anchor);
      const indiaPoint = svg.append('g').attr('transform', `translate(${india[0]},${india[1]})`);
      indiaPoint.append('circle').attr('class', 'india-halo').attr('r', 11);
      indiaPoint.append('circle').attr('class', 'india-dot').attr('r', 4);
      indiaPoint.append('text').attr('class', 'india-label').attr('x', 17).attr('y', -17).text('BENGALURU PAY');
      indiaPoint.append('text').attr('class', 'india-amount').attr('x', 17).attr('y', 7);
      mapReady = true;
      update();
    } catch (error) {
      const svg = $('world-map');
      svg.setAttribute('aria-label', 'Map unavailable; the region-by-region numbers are listed below.');
      svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="currentColor">Map unavailable. See the regional figures below.</text>';
      console.error(error);
    }
  }

  Object.values(inputs).forEach(input => input.addEventListener('input', update));
  update();
  renderMap();
})();
