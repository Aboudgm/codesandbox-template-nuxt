<template>
  <div class="container contact">
    <div class="contact__head">
      <span class="eyebrow"
        ><i class="fa-solid fa-comment-dots"></i> We'd love to hear from
        you</span
      >
      <h1>Get in touch</h1>
      <p class="muted">
        Questions about an order, wholesale enquiries, or just want to say hi?
        Drop us a line.
      </p>
    </div>

    <div class="contact__layout">
      <form class="contact__form card" @submit.prevent="submit">
        <div v-if="sent" class="contact__sent">
          <span>✅</span>
          <h3>Thanks, {{ sentName }}!</h3>
          <p class="muted">
            We've received your message and will reply within one business day.
          </p>
          <button type="button" class="btn btn--ghost" @click="reset">
            Send another
          </button>
        </div>
        <template v-else>
          <h3>Send a message</h3>
          <label class="field">
            <span>Name</span>
            <input v-model="form.name" type="text" required />
          </label>
          <label class="field">
            <span>Email</span>
            <input v-model="form.email" type="email" required />
          </label>
          <label class="field">
            <span>Subject</span>
            <select v-model="form.subject">
              <option>General enquiry</option>
              <option>Order support</option>
              <option>Wholesale &amp; offices</option>
              <option>Feedback</option>
            </select>
          </label>
          <label class="field">
            <span>Message</span>
            <textarea v-model="form.message" rows="5" required></textarea>
          </label>
          <button class="btn btn--block" type="submit">Send message</button>
        </template>
      </form>

      <aside class="contact__info">
        <div class="info-card card">
          <h4>Contact</h4>
          <a href="tel:+61261234567"
            ><i class="fa-solid fa-phone"></i> (02) 6123 4567</a
          >
          <a href="mailto:hello@capitalfresh.com.au"
            ><i class="fa-solid fa-envelope"></i> hello@capitalfresh.com.au</a
          >
        </div>
        <div class="info-card card">
          <h4>Visit the stall</h4>
          <p>
            <i class="fa-solid fa-location-dot"></i> Fyshwick Fresh Food
            Markets, Canberra ACT 2609
          </p>
          <p><i class="fa-solid fa-clock"></i> Mon–Sat · 6:00am – 4:00pm</p>
        </div>
        <div class="info-card info-card--map">
          <div class="map">
            <span>🗺️</span>
            <p>Fyshwick Markets, Canberra</p>
          </div>
        </div>
        <div class="info-card card faq">
          <h4>Quick answers</h4>
          <details>
            <summary>When do you deliver?</summary>
            <p class="muted">
              Monday to Saturday. Order by 6pm for next-day delivery.
            </p>
          </details>
          <details>
            <summary>What's the delivery fee?</summary>
            <p class="muted">$6.90, or free on orders over $50.</p>
          </details>
          <details>
            <summary>Can I pause my subscription?</summary>
            <p class="muted">
              Yes — skip, pause or cancel anytime from your account.
            </p>
          </details>
        </div>
      </aside>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ContactPage',
  data() {
    return {
      sent: false,
      sentName: '',
      form: { name: '', email: '', subject: 'General enquiry', message: '' },
    }
  },
  head: { title: 'Contact — Capital Fresh' },
  methods: {
    submit() {
      this.sentName = this.form.name
      this.sent = true
      this.$store.dispatch('notify', {
        type: 'success',
        message: '📨 Message sent! We’ll be in touch soon.',
      })
    },
    reset() {
      this.sent = false
      this.form = {
        name: '',
        email: '',
        subject: 'General enquiry',
        message: '',
      }
    },
  },
}
</script>

<style scoped>
.contact {
  padding: 40px 20px 70px;
}
.contact__head {
  max-width: 640px;
  margin-bottom: 30px;
}
.contact__head h1 {
  font-size: clamp(1.9rem, 4vw, 2.8rem);
  margin-bottom: 6px;
}
.contact__layout {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 26px;
  align-items: start;
}
.contact__form {
  padding: 28px;
}
.contact__form h3 {
  margin-bottom: 18px;
}
.field {
  display: block;
  margin-bottom: 16px;
}
.field span {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 6px;
}
.field input,
.field select,
.field textarea {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  font-family: inherit;
  font-size: 0.95rem;
  outline: 0;
  background: #fff;
}
.field input:focus,
.field select:focus,
.field textarea:focus {
  border-color: var(--green-600);
  box-shadow: 0 0 0 3px var(--green-100);
}
.contact__sent {
  text-align: center;
  padding: 30px 10px;
}
.contact__sent span {
  font-size: 3rem;
}
.contact__sent h3 {
  margin: 10px 0 4px;
}
.contact__sent .btn {
  margin-top: 14px;
}
.contact__info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.info-card {
  padding: 20px;
}
.info-card h4 {
  font-family: var(--font-body);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  margin-bottom: 12px;
}
.info-card a,
.info-card p {
  display: block;
  padding: 4px 0;
  font-size: 0.95rem;
}
.info-card i {
  width: 22px;
  color: var(--green-600);
}
.info-card a:hover {
  color: var(--green-600);
}
.info-card--map {
  padding: 0;
  overflow: hidden;
  border-radius: var(--radius);
}
.map {
  background: linear-gradient(135deg, var(--green-100), var(--green-50));
  height: 170px;
  display: grid;
  place-items: center;
  text-align: center;
}
.map span {
  font-size: 2.6rem;
}
.map p {
  margin: 4px 0 0;
  font-weight: 600;
  color: var(--green-700);
}
.faq details {
  border-top: 1px solid var(--line);
  padding: 10px 0;
}
.faq details:first-of-type {
  border-top: 0;
}
.faq summary {
  cursor: pointer;
  font-weight: 600;
  font-size: 0.92rem;
}
.faq p {
  margin: 8px 0 0;
  font-size: 0.88rem;
}

@media (max-width: 820px) {
  .contact__layout {
    grid-template-columns: 1fr;
  }
}
</style>
