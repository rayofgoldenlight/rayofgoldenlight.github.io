async function loadLinks() {
  try {
    const response = await fetch('links.txt');
    const text = await response.text();
    const links = text.split('\n').map(l => l.trim()).filter(l => l);

    const groups = {};

    links.forEach(link => {
      try {
        const url = new URL(link);
        const domainParts = url.hostname.split('.');
        const secondLevel = domainParts.slice(-2).join('.');
        
        if (!groups[secondLevel]) {
          groups[secondLevel] = [];
        }
        groups[secondLevel].push(link);
      } catch (error) {
        console.error(`Invalid URL: ${link}`);
      }
    });

    const tbody = document.querySelector('#links-table tbody');

    Object.keys(groups).sort().forEach(domain => {
      const row = document.createElement('tr');
      
      const domainCell = document.createElement('td');
      domainCell.textContent = domain;
      row.appendChild(domainCell);

      const linksCell = document.createElement('td');
      groups[domain].forEach(link => {
        const a = document.createElement('a');
        a.href = link;
        a.textContent = link;
        a.target = '_blank';
        
        linksCell.appendChild(a);
        linksCell.appendChild(document.createElement('br'));
      });
      row.appendChild(linksCell);

      tbody.appendChild(row);
    });

  } catch (error) {
    console.error('Error loading links.txt', error);
  }
}

loadLinks();
