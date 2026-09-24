import { AlertTriangle, FileText, Scale, ShieldCheck, X } from "lucide-react";

interface BoosterTermsModalProps {
  locked?: boolean;
  onAccept: () => void;
  onClose: () => void;
}

const sections = [
  {
    title: "1. คุณสมบัติ บัญชีผู้ใช้ และการยืนยันตัวตน",
    items: [
      "Booster ต้องให้ข้อมูลส่วนตัว ข้อมูลติดต่อ เอกสารยืนยันตัวตน และข้อมูลบัญชีรับ–จ่ายเงินที่ถูกต้อง เป็นปัจจุบัน และเป็นของตนเอง",
      "ผู้ใช้งานต้องมีอายุและความสามารถตามกฎหมายในการทำนิติกรรม หากเป็นผู้เยาว์ต้องได้รับความยินยอมจากผู้แทนโดยชอบธรรมตามที่กฎหมายกำหนด",
      "FlyUp อาจตรวจสอบเอกสาร แหล่งที่มาของเงิน หรือขอข้อมูลเพิ่มเติมเพื่อยืนยันตัวตน ป้องกันการทุจริต และปฏิบัติตามกฎหมาย",
      "ห้ามใช้บัญชีหรือเอกสารของผู้อื่น ห้ามให้บุคคลอื่นใช้บัญชีแทน และต้องรักษารหัสผ่านหรือข้อมูลเข้าสู่ระบบเป็นความลับ",
    ],
  },
  {
    title: "2. การสนับสนุนโปรเจกต์และการตัดสินใจ",
    items: [
      "Booster ต้องอ่านรายละเอียดโปรเจกต์ เป้าหมาย งบประมาณ Milestone ระยะเวลา เงื่อนไขผลตอบแทน ค่าธรรมเนียม และความเสี่ยงก่อนยืนยันรายการ",
      "ข้อมูลบนแพลตฟอร์มมีไว้ประกอบการตัดสินใจ ไม่ใช่คำรับรองผลสำเร็จ คำแนะนำทางการเงิน ภาษี กฎหมาย หรือการรับประกันผลตอบแทนจาก FlyUp",
      "Booster เป็นผู้ตัดสินใจสนับสนุนด้วยตนเองตามความเหมาะสมและความสามารถในการรับความเสี่ยง และควรใช้เงินที่ไม่กระทบต่อค่าใช้จ่ายจำเป็น",
      "คำสั่งที่ยืนยันและชำระเงินสำเร็จแล้วอาจไม่สามารถยกเลิกได้ เว้นแต่เข้าเงื่อนไขการคืนเงินหรือการยกเลิกที่ระบบกำหนด",
    ],
  },
  {
    title: "3. ความเสี่ยง เงินทุน และผลตอบแทน",
    items: [
      "โปรเจกต์อาจล่าช้า เปลี่ยนแปลง ไม่บรรลุเป้าหมาย ยุติการดำเนินงาน หรือสูญเสียเงินสนับสนุนบางส่วนหรือทั้งหมดได้",
      "ผลตอบแทน รายได้ หรือประมาณการใด ๆ เป็นเพียงข้อมูลคาดการณ์ ไม่รับประกันจำนวน ระยะเวลา หรือการได้รับผลตอบแทนจริง",
      "การปล่อยเงินให้ Pioneer ขึ้นอยู่กับเงื่อนไขการระดมทุน Milestone ผลการตรวจสอบ การโหวต และกระบวนการของแพลตฟอร์ม",
      "ค่าธรรมเนียม ภาษี ยอดชำระ และยอดสุทธิจะเป็นไปตามข้อมูลที่แสดงก่อนยืนยันรายการ โดย Booster มีหน้าที่รับผิดชอบภาษีของตนตามกฎหมาย",
      "เมื่อเกิดข้อพิพาท การระงับโปรเจกต์ หรือการคืนเงิน ระยะเวลาและจำนวนเงินที่ได้รับคืนอาจขึ้นอยู่กับเงินคงเหลือ ผู้ให้บริการชำระเงิน และผลการตรวจสอบ",
    ],
  },
  {
    title: "4. การติดตาม Milestone การโหวต และการสื่อสาร",
    items: [
      "Booster ควรติดตามรายงาน หลักฐาน ความคืบหน้า กำหนดการประชุม และประกาศสำคัญของโปรเจกต์อย่างสม่ำเสมอ",
      "การโหวตต้องเกิดจากการพิจารณาข้อมูลโดยสุจริต ห้ามซื้อขายสิทธิ ใช้หลายบัญชี สมรู้ร่วมคิด หรือกระทำการเพื่อบิดเบือนผลโหวต",
      "หากไม่ใช้สิทธิภายในเวลาที่กำหนด ระบบอาจดำเนินการตามกติกาของ Milestone โดยไม่รอการตอบกลับจาก Booster",
      "การแสดงความคิดเห็น คำถาม หรือข้อร้องเรียนต้องสุภาพ เป็นความจริง ไม่คุกคาม ไม่เปิดเผยข้อมูลส่วนบุคคล และไม่ละเมิดสิทธิของผู้อื่น",
    ],
  },
  {
    title: "5. การใช้งานที่ต้องห้ามและทรัพย์สินทางปัญญา",
    items: [
      "ห้ามใช้แพลตฟอร์มเพื่อฟอกเงิน ฉ้อโกง ปลอมแปลงเอกสาร แทรกแซงระบบ เก็บข้อมูลโดยไม่ได้รับอนุญาต หรือทำกิจกรรมที่ผิดกฎหมาย",
      "เนื้อหา เครื่องหมาย รูปภาพ เอกสาร และซอฟต์แวร์ของ FlyUp หรือเจ้าของโปรเจกต์ยังเป็นสิทธิของเจ้าของ ห้ามคัดลอก เผยแพร่ หรือใช้เชิงพาณิชย์โดยไม่มีสิทธิ",
      "FlyUp อาจจำกัด ระงับ หรือยกเลิกบัญชีและธุรกรรมเมื่อพบความเสี่ยง การฝ่าฝืนข้อตกลง หรือเมื่อจำเป็นต้องตรวจสอบเพิ่มเติม",
    ],
  },
];

const BoosterTermsModal = ({ locked = false, onAccept, onClose }: BoosterTermsModalProps) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="booster-terms-title"
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4"
    onMouseDown={(event) => event.target === event.currentTarget && onClose()}
  >
    <div className="flex max-h-[90vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
        <div className="flex gap-3">
          <div className="mt-0.5 rounded-xl bg-primary/10 p-2 text-primary"><FileText size={21} /></div>
          <div>
            <h2 id="booster-terms-title" className="text-[18px] font-semibold text-foreground">
              ข้อตกลงการใช้งาน FlyUp สำหรับ Booster
            </h2>
            <p className="mt-1 text-[12px] text-muted-foreground">
              โปรดอ่านรายละเอียด ความเสี่ยง และนโยบายข้อมูลส่วนบุคคลทั้งหมดก่อนยืนยันตัวตน
            </p>
          </div>
        </div>
        <button type="button" aria-label="ปิด" onClick={onClose} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface-soft hover:text-foreground cursor-pointer">
          <X size={20} />
        </button>
      </div>

      <div className="overflow-y-auto px-5 py-5 sm:px-6">
        <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-[13px] leading-6 text-foreground">
          การกดยอมรับหมายความว่าคุณได้อ่าน เข้าใจ และตกลงปฏิบัติตามข้อกำหนดสำหรับ Booster
          รวมถึงรับทราบความเสี่ยงของการสนับสนุนโปรเจกต์และการประมวลผลข้อมูลส่วนบุคคลตาม PDPA
        </div>

        <div className="mb-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-amber-950/80">
          <AlertTriangle className="mt-0.5 shrink-0" size={19} />
          <p className="text-[13px] leading-6">
            <strong>คำเตือนความเสี่ยง:</strong> การสนับสนุนโปรเจกต์มีความเสี่ยง คุณอาจไม่ได้รับเงินต้นหรือผลตอบแทนตามที่คาดหวัง
            โปรดพิจารณาข้อมูลและความสามารถในการรับความเสี่ยงของตนก่อนทำรายการ
          </p>
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
              <ShieldCheck size={18} /> 6. การคุ้มครองข้อมูลส่วนบุคคล (PDPA)
            </h3>
            <div className="space-y-3 text-[13px] leading-6 text-green-950/75">
              <p><strong>ข้อมูลที่เก็บ:</strong> ข้อมูลบัญชีและการติดต่อ บัตรประชาชน ภาพใบหน้า ข้อมูลบัญชีธนาคาร ข้อมูลการชำระเงิน รายการสนับสนุน การโหวต การประชุม ข้อร้องเรียน และบันทึกการใช้งาน</p>
              <p><strong>วัตถุประสงค์:</strong> เพื่อยืนยันตัวตน ให้บริการและบันทึกธุรกรรม ดำเนินการชำระหรือคืนเงิน จัดการสิทธิ Booster ป้องกันการทุจริต ตรวจสอบข้อร้องเรียน และปฏิบัติตามกฎหมาย</p>
              <p><strong>การเปิดเผย:</strong> FlyUp อาจเปิดเผยข้อมูลเท่าที่จำเป็นแก่ผู้ให้บริการระบบ ผู้ให้บริการยืนยันตัวตนหรือชำระเงิน Pioneer ที่เกี่ยวข้อง คู่สัญญา ผู้ตรวจสอบ หรือหน่วยงานรัฐตามกฎหมาย</p>
              <p><strong>ระยะเวลาและความปลอดภัย:</strong> ข้อมูลจะถูกเก็บเท่าที่จำเป็นต่อวัตถุประสงค์ ภาระตามสัญญา อายุความ และกฎหมาย พร้อมมาตรการควบคุมการเข้าถึงที่เหมาะสม</p>
              <p><strong>สิทธิของคุณ:</strong> คุณอาจขอเข้าถึง แก้ไข โอน ลบ จำกัดหรือคัดค้านการประมวลผล และถอนความยินยอมเมื่อใช้ความยินยอมเป็นฐาน ทั้งนี้บางคำขออาจถูกจำกัดตามสัญญาหรือกฎหมาย</p>
              <p className="text-[12px]">ข้อมูลที่จำเป็นต่อการยืนยันตัวตน ธุรกรรม การป้องกันทุจริต หรือหน้าที่ตามกฎหมายอาจไม่สามารถถอนหรือขอลบได้ทันทีขณะที่ยังมีภาระผูกพัน</p>
            </div>
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-amber-900">
              <Scale size={18} /> 7. การรับรองและการยอมรับ
            </h3>
            <p className="text-[13px] leading-6 text-amber-950/75">
              คุณรับรองว่าข้อมูลและเอกสารที่ส่งเป็นความจริง เงินที่ใช้ทำรายการมาจากแหล่งที่ชอบด้วยกฎหมาย
              คุณได้พิจารณาความเสี่ยงด้วยตนเอง และเข้าใจว่าการให้ข้อมูลเท็จหรือฝ่าฝืนข้อตกลงอาจทำให้รายการถูกระงับ
              บัญชีถูกจำกัดหรือยกเลิก และอาจเกิดความรับผิดตามกฎหมาย
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

export default BoosterTermsModal;
