import { contact } from "@/content/contact";

export function Contact() {
  return (
    <section className="slab pane s-cont" id="iletisim" data-k="3" aria-labelledby="h-ilet">
      <div className="slab-in">
        <div className="ct">
          <div>
            <h2 id="h-ilet" className="rv [--r:0]">
              {contact.title}
            </h2>
            <p className="lead rv [--r:1]">{contact.lead}</p>
            <dl className="fields rv [--r:2]">
              {contact.fields.map((field) => (
                <div key={field.label}>
                  <dt>{field.label}</dt>
                  <dd className={field.mono ? "mono" : undefined}>
                    {field.href ? <a href={field.href}>{field.value}</a> : field.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="big" aria-hidden="true">
            {contact.big}
          </p>
        </div>
      </div>
    </section>
  );
}
