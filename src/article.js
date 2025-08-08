const articles = [
    {
      id: "1",
      title: "IKI-GIZ-ICUE Completion Ceremony",
      lead: "Province's Leader Attending",
      author: "ICUE-IKI-Giz & City of Hội An",
      date: "2025-05-16",
      image: {
        src: "/public/news/articles/article_1/all_together.jpg",
        caption: "Ceremony Participants"
      },
      bodyHTML: `
        <p>On May 16, 2025, the Institute for Construction and Urban Economic Research (ICUE), in coordination with the People’s Committee of Hoi An City, organized a special event to inaugurate and hand over the green space and coastal park (now named Au Co Park), marking the successful completion of the project titled:
        "Preventing erosion on Cua Dai beach through green corridors and park",
        under the Climate Capacity Building and Biodiversity Action at National and Local Levels (CBF) program.

        This initiative was implemented under the grant agreement of the International Climate Initiative (IKI), with ICUE as the grant recipient and project implementer, and the Deutsche Gesellschaft für Internationale Zusammenarbeit (GIZ) GmbH as the project manager. The project played a crucial role in supporting climate action and biodiversity protection efforts in Vietnam.

        The event served not only as a closing ceremony for the project but also as an opportunity to reflect on the progress made thanks to the shared commitment of all partners involved. The presence of stakeholders, experts, and contributors further highlighted the collaborative nature of this initiative and its positive impact on sustainable urban development in the Cua Dai area of Hoi An City.

        Over the past months, the project not only strengthened technical and institutional capacities, but also promoted deeper cooperation between central and local governments on climate change-related issues. ICUE and the Hoi An city government were honored to contribute to this meaningful effort, which reflects a shared vision of a future more resilient to climate change and more responsible toward the environment.

        None of this would have been possible without the generous support from IKI and the enthusiastic assistance from GIZ in implementing the project. We also deeply appreciate the facilitation provided by the People’s Committee of Quang Nam Province, the close coordination with the Hoi An City government, the Cua Dai Ward authorities, and the collaboration from local communities and civil society organizations.

        The trust and funding from IKI & GIZ made this project a reality and delivered tangible benefits to the local community. We'd like to express our heartfelt gratitude to IKI & Giz for their continuous support and the trust they have placed in us.

        This inauguration and handover ceremony is not an end, but rather a new beginning—paving the way for future cooperation towards greener, more sustainable cities in Vietnam and beyond.</p>
        <h2>Thank You 🤝</h2>
        <blockquote>"We Hope You Enjoyed The Ceremony - Thanks for Coming!"</blockquote>
      `,
      pdf: "/public/files/speech.pdf"
    }
    // Add more articles here...
];

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const article = articles.find(a => a.id === id);

  if (!article) {
    document.getElementById("content").innerHTML = `<h2 style="text-align:center;">🚫 Article not found.</h2>`;
    return;
  }

  // Populate HTML
  document.title = article.title;
  document.getElementById("article-title").textContent = article.title;
  document.getElementById("article-lead").textContent = article.lead;
  document.getElementById("article-author").textContent = `By ${article.author}`;
  document.getElementById("article-date").textContent = new Date(article.date).toDateString();
  document.getElementById("article-date").setAttribute("datetime", article.date);
  document.getElementById("article-image").src = article.image.src;
  document.getElementById("article-caption").textContent = article.image.caption;
  document.getElementById("article-body").innerHTML = article.bodyHTML;

  if (article.pdf) {
    const dlBtn = document.getElementById("article-download");
    dlBtn.href = article.pdf;
    dlBtn.style.display = "inline-block";
  }
});
