import { FileText, Scale, ShieldCheck, X } from "lucide-react";

interface PioneerTermsModalProps {
  locked?: boolean;
  onAccept: () => void;
  onClose: () => void;
}

const sections = [
  {
    title: "1. คุณสมบัติและการยืนยันตัวตน",
    items: [
      "ผู้สมัครต้องให้ข้อมูลส่วนตัว ข้อมูลสถานศึกษา และเอกสารยืนยันตัวตนที่ถูกต้อง เป็นปัจจุบัน และเป็นของตนเอง",
      "FlyUp อาจตรวจสอบเอกสารหรือขอข้อมูลเพิ่มเติมเพื่อยืนยันตัวตน ป้องกันการทุจริต และรักษาความปลอดภัยของแพลตฟอร์ม",
      "ห้ามนำบัญชีหรือเอกสารของบุคคลอื่นมาใช้ รวมถึงห้ามให้บุคคลอื่นใช้งานบัญชีแทน",
    ],
  },
  {
    title: "2. หน้าที่ของ Pioneer และข้อมูลโปรเจกต์",
    items: [
      "ข้อมูลโปรเจกต์ เป้าหมาย งบประมาณ ระยะเวลา Milestone หลักฐาน และรายงานความคืบหน้าต้องเป็นความจริงและตรวจสอบได้",
      "Pioneer ต้องดำเนินงานตาม Milestone ที่ประกาศ สื่อสารความเปลี่ยนแปลง และตอบข้อซักถามหรือคำร้องเรียนภายในระยะเวลาที่เหมาะสม",
      "ห้ามเผยแพร่ข้อมูลผิดกฎหมาย หลอกลวง ละเมิดสิทธิส่วนบุคคล หรือละเมิดทรัพย์สินทางปัญญาของผู้อื่น",
      "FlyUp สามารถระงับการเผยแพร่ การระดมทุน หรือบัญชีผู้ใช้ได้ หากพบความเสี่ยง การฝ่าฝืนข้อตกลง หรือจำเป็นต้องตรวจสอบเพิ่มเติม",
    ],
  },
  {
    title: "3. เงินทุน Milestone และผลตอบแทน",
    items: [
      "การได้รับเงินขึ้นอยู่กับเงื่อนไขการระดมทุน การอนุมัติ Milestone การโหวต และกระบวนการตรวจสอบของระบบ",
      "Pioneer ยอมรับค่าธรรมเนียม ภาษี และยอดสุทธิที่ระบบแสดงก่อนยืนยันรายการ รวมถึงรับผิดชอบภาษีของตนตามกฎหมาย",
      "กรณีโปรเจกต์ไม่เป็นไปตามเงื่อนไข เงินส่วนที่ยังไม่ถูกปล่อยอาจเข้าสู่กระบวนการคืนเงิน ระงับ หรือพิจารณาข้อร้องเรียน",
      "หากโปรเจกต์มีข้อตกลงแบ่งผลตอบแทน Pioneer ต้องนำส่งและแจกจ่ายผลตอบแทนตามรอบและเงื่อนไขที่ระบุในระบบ",
    ],
  },
  {
    title: "4. ทรัพย์สินทางปัญญา",
    items: [
      "Pioneer ยังคงเป็นเจ้าของผลงานของตน เว้นแต่มีสัญญาหรือข้อตกลงเฉพาะที่กำหนดไว้เป็นอย่างอื่น",
      "Pioneer อนุญาตให้ FlyUp แสดง ทำสำเนา และประมวลผลเนื้อหาเท่าที่จำเป็นต่อการให้บริการ ตรวจสอบโปรเจกต์ และประชาสัมพันธ์โปรเจกต์บนแพลตฟอร์ม",
      "Pioneer ต้องมีสิทธิใช้รูปภาพ วิดีโอ เอกสาร ซอฟต์แวร์ เครื่องหมาย และเนื้อหาทั้งหมดที่นำมาเผยแพร่",
    ],
  },
];

const PioneerTermsModal = ({ locked = false, onAccept, onClose }: PioneerTermsModalProps) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="pioneer-terms-title"
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4"
    onMouseDown={(event) => event.target === event.currentTarget && onClose()}
  >
    <div className="flex max-h-[90vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
        <div className="flex gap-3">
          <div className="mt-0.5 rounded-xl bg-primary/10 p-2 text-primary">
            <FileText size={21} />
          </div>
          <div>
            <h2 id="pioneer-terms-title" className="text-[18px] font-semibold text-foreground">
              ข้อตกลงการใช้งาน FlyUp สำหรับ Pioneer
            </h2>
            <p className="mt-1 text-[12px] text-muted-foreground">
              โปรดอ่านรายละเอียดทั้งหมดก่อนยืนยันการสมัครและส่งข้อมูลยืนยันตัวตน
            </p>
          </div>
        </div>
        <button type="button" aria-label="ปิด" onClick={onClose} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface-soft hover:text-foreground cursor-pointer">
          <X size={20} />
        </button>
      </div>

      <div className="overflow-y-auto px-5 py-5 sm:px-6">
        <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-[13px] leading-6 text-foreground">
          การกดยอมรับหมายความว่าคุณได้อ่าน เข้าใจ และตกลงปฏิบัติตามข้อกำหนดสำหรับ Pioneer
          รวมถึงรับทราบการประมวลผลข้อมูลส่วนบุคคลตาม PDPA ข้อตกลงนี้ไม่ตัดสิทธิที่คุณมีตามกฎหมาย
        </div>

        <div className="space-y-5">
          {sections.map((section) => (
            <section key={section.title}>
              <h3 className="mb-2 text-[14px] font-semibold text-foreground">{section.title}</h3>
              <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-6 text-muted-foreground">
                {section.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ))}

          <section className="rounded-xl border border-green-200 bg-green-50/60 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-green-800">
              <ShieldCheck size={18} /> 5. การคุ้มครองข้อมูลส่วนบุคคล (PDPA)
            </h3>
            <div className="space-y-3 text-[13px] leading-6 text-green-950/75">
              <p><strong>ข้อมูลที่เก็บ:</strong> ข้อมูลบัญชีและการติดต่อ ข้อมูลสถานศึกษา บัตรนักศึกษา บัตรประชาชน ภาพใบหน้า ข้อมูลบัญชีธนาคาร ข้อมูลโปรเจกต์ และบันทึกการใช้งานหรือธุรกรรม</p>
              <p><strong>วัตถุประสงค์:</strong> เพื่อยืนยันตัวตนและคุณสมบัติ ให้บริการแพลตฟอร์ม ดำเนินการรับ–จ่ายเงิน ป้องกันการทุจริต ตรวจสอบข้อร้องเรียน ปฏิบัติตามสัญญา และหน้าที่ตามกฎหมาย</p>
              <p><strong>การเปิดเผย:</strong> FlyUp อาจเปิดเผยข้อมูลเท่าที่จำเป็นแก่ผู้ให้บริการระบบ ผู้ให้บริการชำระเงิน สถาบันการศึกษา คู่สัญญาที่เกี่ยวข้อง หรือหน่วยงานรัฐตามกฎหมาย โดยใช้มาตรการคุ้มครองที่เหมาะสม</p>
              <p><strong>ระยะเวลาและความปลอดภัย:</strong> ข้อมูลจะถูกเก็บเท่าที่จำเป็นต่อวัตถุประสงค์ สัญญา และระยะเวลาตามกฎหมาย พร้อมมาตรการควบคุมการเข้าถึงและรักษาความปลอดภัย</p>
              <p><strong>สิทธิของคุณ:</strong> คุณอาจขอเข้าถึง แก้ไข โอน ลบ จำกัดหรือคัดค้านการประมวลผล และถอนความยินยอมในกรณีที่ใช้ความยินยอมเป็นฐาน ทั้งนี้บางคำขออาจถูกจำกัดตามสัญญาหรือกฎหมาย</p>
              <p className="text-[12px]">ข้อมูลที่จำเป็นต่อการยืนยันตัวตน การทำสัญญา หรือการปฏิบัติตามกฎหมายอาจไม่สามารถถอนหรือขอลบได้ทันทีในระหว่างที่ยังมีภาระผูกพัน</p>
            </div>
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-amber-900">
              <Scale size={18} /> 6. การรับรองและการยอมรับ
            </h3>
            <p className="text-[13px] leading-6 text-amber-950/75">
              คุณรับรองว่าข้อมูลและเอกสารที่ส่งเป็นความจริง คุณมีอำนาจยอมรับข้อตกลงนี้ และเข้าใจว่าการให้ข้อมูลเท็จ
              อาจทำให้คำขอถูกปฏิเสธ บัญชีถูกระงับ โปรเจกต์ถูกยกเลิก หรือเกิดความรับผิดตามกฎหมาย
            </p>
          </section>
        </div>

        <a href="/legal/terms" target="_blank" rel="noreferrer" className="mt-5 inline-flex text-[13px] font-medium text-primary underline underline-offset-4 hover:text-primary-hover">
          อ่านข้อกำหนดและเงื่อนไขฉบับเต็มของ FlyUp
        </a>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <button type="button" onClick={onClose} className="rounded-lg border border-border px-5 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-surface-soft cursor-pointer">
          {locked ? "ปิด" : "ยังไม่ยอมรับ"}
        </button>
        {!locked && (
          <button type="button" onClick={onAccept} className="rounded-lg bg-primary px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover cursor-pointer">
            อ่านแล้วและยอมรับข้อตกลง
          </button>
        )}
      </div>
    </div>
  </div>
);

export default PioneerTermsModal;
