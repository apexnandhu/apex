<script>
  import { Layout } from "@budibase/bbui"
  import Bulgaria from "../../assets/Fotoram.io (2).png"
  import Covanta from "../../assets/Fotoram.io (2).png"
  import Schnellecke from "../../assets/Fotoram.io (2).png"

  const testimonials = [
    {
      text: "Automation streamlines repetitive tasks, reducing the need for manual intervention. This frees up employees to focus on more value-added activities, thereby increasing overall efficiency.",
      name: "- Carenty",
      role: "Core",
      image: Covanta,
      imageSize: 45,
    },
    {
      text: "By automating processes, businesses can save on labor costs associated with manual work. Additionally, automation reduces the likelihood of errors, minimizing costly mistakes.",
      name: "- Carenty",
      role: "",
      image: Bulgaria,
      imageSize: 45,
    },
    {
      text: "Automation software can collect and analyze data in real-time, providing insights that enable informed decision-making. This helps businesses stay agile and competitive in dynamic markets",
      name: "- Carenty",
      role: "IT",
      image: Schnellecke,
      imageSize: 45,
    },
  ]
  const testimonial = testimonials[Math.floor(Math.random() * 3)]
</script>

<div class="testimonial">
  <Layout noPadding gap="S">
    <img
      width={testimonial.imageSize}
      alt="a-happy-budibase-user"
      src={testimonial.image}
    />
    <div class="text">
      "{testimonial.text}"
    </div>
    <div class="author">
      <div class="name">{testimonial.name}</div>
      <div class="company">{testimonial.role}</div>
    </div>
  </Layout>
</div>

<style>
  .testimonial {
    width: 380px;
    padding: 40px;
  }
  .text {
    font-size: var(--font-size-l);
    font-style: oblique;
    color: black;
  }
  .name {
    font-weight: bold;
    color: var(--spectrum-global-color-gray-900);
    font-size: var(--font-size-l);
    color: black;
  }
  .company {
    color: var(--spectrum-global-color-gray-700);
    color: black;
  }
</style>
