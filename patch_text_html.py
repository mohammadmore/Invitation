import sys

with open("asvashop/index.html", "r", encoding="utf-8") as f:
    content = f.read()

old_text1 = "با سلام و احترام<br>\n                        با افتخار از شما دعوت میکنیم تا با حضور ارزشمند خود در نمایشگاه ایران فارما، میهمان غرفه بهان سار باشید."
new_text1 = "با سلام و احترام<br>\n                        با افتخار از شما دعوت می کنیم تا با حضور ارزشمند خود در نمایشگاه ایران فارما، میهمان غرفه بهان سار باشید."

old_text2 = "این دیدار، فرصتی است برای گفتوگویی تازه، آشنایی با محصولات و دستاوردهای ما و گامی برای توسعه همکاریهای ارزشمند آینده."
new_text2 = "این دیدار، فرصتی است برای گفت و گویی تازه، آشنایی با محصولات و دستاوردهای ما و گامی برای توسعه همکاری های ارزشمند آینده."

content = content.replace(old_text1, new_text1)
content = content.replace(old_text2, new_text2)

with open("asvashop/index.html", "w", encoding="utf-8") as f:
    f.write(content)
