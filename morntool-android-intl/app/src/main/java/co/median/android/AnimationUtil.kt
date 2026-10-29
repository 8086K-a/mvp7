package co.median.android

import android.animation.ValueAnimator
import android.view.View

object AnimationUtil {

    @JvmStatic
    fun animateBottomPadding(
        view: View,
        from: Int,
        to: Int,
        duration: Long = 200
    ) {
        ValueAnimator.ofInt(from, to).apply {
            this.duration = duration
            addUpdateListener { animator ->
                val paddingBottom = animator.animatedValue as Int
                view.setPadding(
                    view.paddingLeft,
                    view.paddingTop,
                    view.paddingRight,
                    paddingBottom
                )
            }
            start()
        }
    }
}
